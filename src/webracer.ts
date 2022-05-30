import * as BABYLON from 'babylonjs'
import * as GUI from 'babylonjs-gui'
import * as tf from '@tensorflow/tfjs'
import { BabylonFileLoaderConfiguration, float, int } from 'babylonjs'
import { OneHotInputs, Rank, Tensor, Tensor3D } from '@tensorflow/tfjs'

export default class WebRacer {
    private canvasElement: HTMLCanvasElement
    private engine: BABYLON.Engine
    private scene: BABYLON.Scene
    private camera: BABYLON.Camera
    private controller: NNController
    private imageUrls = ['./graphics/poses/headon.png', './graphics/poses/leanleft.png', './graphics/poses/leanRight.png']
    private classes = [0, -1, 1]
    private currentClass = 0
    
    private video: HTMLVideoElement
    private capture: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private guiTexture: GUI.AdvancedDynamicTexture
    private instructionImage: GUI.Image
    private instructionText: GUI.TextBlock
    private captureButton: GUI.Button
    private countdownText: GUI.TextBlock
    private captureInterval

    private coinMaterial: BABYLON.StandardMaterial
    
    private images: {[key: int]:tf.Tensor<Rank>[]} = {}

    constructor(canvasElementName: string) {
        this.canvasElement = document.getElementById(canvasElementName) as HTMLCanvasElement
        this.engine = new BABYLON.Engine(this.canvasElement, true)
        this.video = document.getElementById('webcam') as HTMLVideoElement
        this.capture = document.getElementById('capture') as HTMLCanvasElement
        this.ctx = this.capture.getContext('2d') as CanvasRenderingContext2D
        this.scene = new BABYLON.Scene(this.engine)
        this.guiTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI')

        this.controller = new NNController(this.guiTexture, this.classes.length)
        this.controller.loadModel()
    }

    public createScene() {
        
        this.scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), new BABYLON.CannonJSPlugin())
        this.camera = new BABYLON.ArcRotateCamera('Camera', 15, -30, 10, BABYLON.Vector3.Zero(),
            this.scene)
        
        this.camera.attachControl(this.canvasElement, true)
        this.coinMaterial = new BABYLON.StandardMaterial('coinMaterial')
        this.coinMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.2)

        let light = new BABYLON.DirectionalLight('light', new BABYLON.Vector3(1, -1, 0), this.scene)
        light.intensity = 1.2
        light.specular = new BABYLON.Color3(0.99, 0.97, 0.97)
        light.diffuse = new BABYLON.Color3(0.93, 0.93, 0.87)
        let ambientLight = new BABYLON.HemisphericLight('ambientLight', new BABYLON.Vector3(0, -1, 0), this.scene)
        ambientLight.diffuse = new BABYLON.Color3(0.2, 0.2, 0.6)
        ambientLight.intensity = 2
        let ground = BABYLON.MeshBuilder.CreateGround('ground', {width:20, height:20}, this.scene)
        ground.setPositionWithLocalVector(new BABYLON.Vector3(0, -2, 0))
        this.addCoin()
        
    }

    public showCalibration() {
        
        
        let grid = new GUI.Grid()
        this.guiTexture.addControl(grid)
        this.instructionImage = new GUI.Image('pose', this.imageUrls[this.currentClass])
        
        this.instructionImage.widthInPixels = 224
        this.instructionImage.heightInPixels = 224
        
        this.instructionText = new GUI.TextBlock('instructions', 'Make sure the webcam is working, \nassume the pose indicated and press "Ready"')
        this.instructionText.outlineColor = 'white'
        this.instructionText.outlineWidth = 3
        this.instructionText.top = -150
        
        this.captureButton = GUI.Button.CreateSimpleButton('captureButton', 'READY')
        this.captureButton.width = "200px"
        this.captureButton.height = "50px"
        this.captureButton.background = "blue"
        this.captureButton.color = "white"
        this.captureButton.cornerRadius = 10
        this.captureButton.top = 150
        this.captureButton.isVisible = true
        this.captureButton.onPointerClickObservable.add(() => this.captureImages(12, this.currentClass))

        this.countdownText = new GUI.TextBlock('countdown', '3')
        this.countdownText.fontSize = 25
        this.countdownText.top = 150
        this.countdownText.fontFamily = 'Verdana'
        this.countdownText.outlineColor = 'white'
        this.countdownText.outlineWidth = 3
        this.countdownText.isVisible = false

        this.guiTexture.addControl(this.instructionText)
        this.guiTexture.addControl(this.instructionImage)
        this.guiTexture.addControl(this.captureButton)
        this.guiTexture.addControl(this.countdownText)
        
        
        
        
        console.log('showing calibration')
    }

    public addCoin() {
        let coinMesh = BABYLON.MeshBuilder.CreateCylinder('coin', {height:0.2, diameter:1}, this.scene)
        coinMesh.material = this.coinMaterial
        coinMesh.physicsImpostor = new BABYLON.PhysicsImpostor(coinMesh, 
            BABYLON.PhysicsImpostor.SphereImpostor, {mass:1}, this.scene)
        coinMesh.rotate(BABYLON.Vector3.Right(), Math.PI/2)
        
        console.log(coinMesh.animations)
        coinMesh.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0, Math.PI/2, 0))
        
    }

    public captureImages(n:int, class_label:int) {
        this.captureButton.isVisible = false
        this.images[class_label] = []
        this.countdownText.isVisible = true
        this.captureInterval = setInterval((() => {
            let data = this.ctx.getImageData(0, 0, this.capture.width, this.capture.height)
            let processed = tf.browser.fromPixels(data).div(255)
            this.images[class_label].push(processed)
            if (this.images[class_label].length >= n) {
                this.currentClass += 1
                if (this.currentClass >= this.classes.length) { //finished
                    this.currentClass = 0
                    this.instructionText.text = 'All done! Please wait for the network to train'
                    this.instructionImage.isVisible = false
                    this.countdownText.text = 'Preparing and training net, please wait'
                    this.controller.train(this.images)
                }
                else {
                    this.setInstructionImage(this.imageUrls[this.currentClass])
                    this.countdownText.isVisible = false
                    this.captureButton.isVisible = true
                    this.captureButton.isEnabled = true
                }
                clearInterval(this.captureInterval)
                
            }
            this.countdownText.text = "" + (3 - (250*this.images[class_label].length)/1000)
            

        }).bind(this), 250)

    }

    public setInstructionImage(url:string) {
        this.instructionImage.source = url
    }

    public render() {
        this.engine.runRenderLoop(() => {
            this.scene.render()
        })

        window.addEventListener('resize', () => {
            this.engine.resize()
        })
    }
}

class NNController {
    private model : tf.GraphModel
    private guiTexture: GUI.AdvancedDynamicTexture
    private trainingProgress: GUI.TextBlock
    private trainingInputs: Tensor[]
    private trainingOutputs: Tensor
    private n_classes:int

    constructor(guiTexture:GUI.AdvancedDynamicTexture, n_classes:int) {
        this.guiTexture = guiTexture
        this.n_classes = n_classes
        this.trainingProgress = new GUI.TextBlock('trainingProgress', 'progress')
        this.guiTexture.addControl(this.trainingProgress)
        
    }

    async loadModel() {
        try {
            this.model = await tf.loadGraphModel('localstorage://mobilenet');
            (this.model.predict(tf.zeros([1, 224, 224, 3])) as Tensor).dispose()
            console.log('loaded model: ', this.model)
        }
        catch (e) {
            console.log('model not in localstorage, loading from TFHub')
            this.model = await tf.loadGraphModel(
                'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1',
                {fromTFHub: true})
            ;(this.model.predict(tf.zeros([1, 224, 224, 3])) as Tensor).dispose()
            console.log('loaded model: ', this.model)
            
        }
    }

    enableCamera() {

    }

    async train(trainData:{[key: number]:Tensor[]}) {
        this.trainingInputs = []
        let outputs: number[] = []
        if (!this.guiTexture.getControlByName('trainingProgress')) {
            this.guiTexture.addControl(this.trainingProgress)
        }
        for (let k in trainData) {
            for (let imgData of trainData[k]) {
                let trainTensor = tf.tidy(() => {
                    return (this.model.predict(imgData.expandDims()) as Tensor).squeeze()

                })
                this.trainingInputs.push(trainTensor)
                outputs.push(parseInt(k))
                await tf.nextFrame()
            }
        }
        this.trainingOutputs = tf.oneHot(outputs, this.n_classes)

    }

    predict() : float {
        return 0
    }
}
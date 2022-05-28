import * as BABYLON from 'babylonjs'
import * as GUI from 'babylonjs-gui'
import * as tf from '@tensorflow/tfjs'
import { BabylonFileLoaderConfiguration, float, int } from 'babylonjs'
import { Rank, Tensor3D } from '@tensorflow/tfjs'

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
    
    private images: {[key: int]: [tf.Tensor<Rank>?]} = {}

    constructor(canvasElementName: string) {
        this.canvasElement = document.getElementById(canvasElementName) as HTMLCanvasElement
        this.engine = new BABYLON.Engine(this.canvasElement, true)
        this.video = document.getElementById('webcam') as HTMLVideoElement
        this.capture = document.getElementById('capture') as HTMLCanvasElement
        this.ctx = this.capture.getContext('2d') as CanvasRenderingContext2D
        this.controller = new NNController(this.guiTexture)
        this.controller.loadModel()
    }

    public createScene() {
        this.scene = new BABYLON.Scene(this.engine)
        this.scene.enablePhysics(BABYLON.Vector3.Zero(), new BABYLON.CannonJSPlugin())
        this.camera = new BABYLON.ArcRotateCamera('Camera', 15, -30, 10, BABYLON.Vector3.Zero(),
            this.scene)
        this.camera.attachControl(this.canvasElement, true)
        let light = new BABYLON.HemisphericLight('light', BABYLON.Vector3.Zero(), this.scene)
        let ground = BABYLON.MeshBuilder.CreateGround('ground', {width:20, height:20}, this.scene)
        let sphere = BABYLON.MeshBuilder.CreateSphere('speher', {segments:18, diameter:2}, this.scene)
        ground.setPositionWithLocalVector(new BABYLON.Vector3(0, -5, 0))
    }

    public showCalibration() {
        this.guiTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI')
        
        let grid = new GUI.Grid()
        this.guiTexture.addControl(grid)
        this.instructionImage = new GUI.Image('pose', this.imageUrls[this.currentClass])
        
        this.instructionImage.widthInPixels = 224
        this.instructionImage.heightInPixels = 224
        
        /*let imgPlane = BABYLON.MeshBuilder.CreatePlane('imagePlane', {}, this.scene)
        let mat = new BABYLON.StandardMaterial('imgMaterial', this.scene)
        mat.diffuseTexture = tex
        mat.specularColor = BABYLON.Color3.Black()
        imgPlane.material = mat
        imgPlane.position = new BABYLON.Vector3(0, 1, 0)*/
        /*
        setInterval(async () => {
            let data = ctx.getImageData(0, 0, canv.width, canv.height)
            
            let resized = tf.browser.fromPixels(data).resizeBilinear([224, 224])
            console.log('texture data:', data)
            console.log('resized:', resized)
        }, 1000)*/
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
        
        
        
        
        console.log('showing calibration 2')
        //tf.image.resizeBilinear()
    }

    public addCoin() {
        let coinMesh = BABYLON.MeshBuilder.CreateCylinder('coin', {height:0.1, diameter:1}, this.scene)
        
    }

    public captureImages(n:int, class_label:int) {
        this.captureButton.isVisible = false
        this.images[class_label] = []
        this.countdownText.isVisible = true
        this.captureInterval = setInterval((() => {
            let data = this.ctx.getImageData(0, 0, this.capture.width, this.capture.height)
            let processed = tf.browser.fromPixels(data).div(255)
            this.images[class_label].push(processed)
            console.log('data from cam: ', processed)
            console.log('captured', this.images[class_label].length, 'images so far')
            if (this.images[class_label].length >= n) {
                this.currentClass += 1
                if (this.currentClass >= this.classes.length) { //finished
                    this.currentClass = 0
                    this.instructionText.text = 'All done! Please wait for the network to train'
                    this.instructionImage.isVisible = false
                }
                else {
                    this.setInstructionImage(this.imageUrls[this.currentClass])
                    this.countdownText.isVisible = false
                    this.captureButton.isVisible = true
                    this.captureButton.isEnabled = true
                    console.log('reenabled button')
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
    private model 
    private guiTexture
    constructor(guiTexture) {
        this.guiTexture = guiTexture
    }

    async loadModel() {
        try {
            this.model = await tf.loadGraphModel('localstorage://mobilenet')
            console.log('loaded model: ', this.model)
        }
        catch (e) {
            console.log('model not in localstorage, loading from TFHub')
            this.model = await tf.loadGraphModel(
                'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1',
                {fromTFHub: true})
            console.log('loaded model: ', this.model)
            
        }
    }

    enableCamera() {

    }

    train(trainData:{int:[ImageData]}) {

    }

    predict() : float {
        return 0
    }
}
import * as BABYLON from 'babylonjs'
import * as GUI from 'babylonjs-gui'
import * as tf from '@tensorflow/tfjs'
import { float } from 'babylonjs'


export default class WebRacer {
    private canvasElement: HTMLCanvasElement
    private engine: BABYLON.Engine
    private scene: BABYLON.Scene
    private camera: BABYLON.Camera
    private controller: NNController
    private headonUrl = 'https://github.com/a-r-t-i-f-i-c-i-a-l/webracer/raw/main/graphics/poses/headon.png'

    constructor(canvasElementName: string) {
        this.canvasElement = document.getElementById(canvasElementName) as HTMLCanvasElement
        this.engine = new BABYLON.Engine(this.canvasElement, true)
        this.controller = new NNController()
        this.controller.loadModel()
    }

    public createScene() {
        this.scene = new BABYLON.Scene(this.engine)
        this.camera = new BABYLON.ArcRotateCamera('Camera', 15, -30, 10, BABYLON.Vector3.Zero(),
            this.scene)
        this.camera.attachControl(this.canvasElement, true)
        let light = new BABYLON.HemisphericLight('light', BABYLON.Vector3.Zero(), this.scene)
        let ground = BABYLON.MeshBuilder.CreateGround('ground', {width:20, height:20}, this.scene)
        let sphere = BABYLON.MeshBuilder.CreateSphere('speher', {segments:18, diameter:2}, this.scene)
        ground.setPositionWithLocalVector(new BABYLON.Vector3(0, -5, 0))
    }

    public showCalibration() {
        let guiTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI')
        
        let grid = new GUI.Grid()
        guiTexture.addControl(grid)
        let image = new GUI.Image('pose', this.headonUrl)
        let vid = document.getElementById('webcam') as HTMLVideoElement
        let canv = document.getElementById('capture') as HTMLCanvasElement
        let ctx = canv.getContext('2d')
        let img = new Image
        img.src = 'headon.png'
        ctx.drawImage(img, 0, 0, canv.width, canv.height)
        console.log('image: ', image)
        let tex = new BABYLON.VideoTexture('cam-image', vid, this.scene)
        let imgPlane = BABYLON.MeshBuilder.CreatePlane('imagePlane', {}, this.scene)
        let mat = new BABYLON.StandardMaterial('imgMaterial', this.scene)
        mat.diffuseTexture = tex
        mat.specularColor = BABYLON.Color3.Black()
        imgPlane.material = mat
        imgPlane.position = new BABYLON.Vector3(0, 1, 0)
        /*
        setInterval(async () => {
            let data = ctx.getImageData(0, 0, canv.width, canv.height)
            
            let resized = tf.browser.fromPixels(data).resizeBilinear([224, 224])
            console.log('texture data:', data)
            console.log('resized:', resized)
        }, 1000)*/
        let rect = new GUI.Rectangle('imgRect')
        let instructions = new GUI.TextBlock('instructions', 'Assume the pose indicated and press "Ready"')
        grid.addColumnDefinition(1)
        grid.addRowDefinition(0.5)
        grid.addControl(instructions, 0,0)
        grid.addControl(image, 1, 0)
        
        console.log('showing calibration')
        //tf.image.resizeBilinear()
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
    constructor() {

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
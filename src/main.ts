import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <h1>Hello Vite!</h1>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`
import WebRacer from "./webracer";

window.addEventListener("DOMContentLoaded", () => {
    let game = new WebRacer('webracer-canvas')
    navigator.mediaDevices.getUserMedia({video:{height:224, width:224}}).then((stream) => {
        let cam = document.getElementById("webcam") as HTMLVideoElement
        cam.srcObject = stream
    })
    game.createScene()
    game.render()
    game.showCalibration()
})
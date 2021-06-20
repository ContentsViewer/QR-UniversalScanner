import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import jsQR from "jsqr";


var video = document.createElement("video");
var videoCanvas = document.getElementById("videoCanvas");
var loadingMessage = document.getElementById("loadingMessage");
var outputContainer = document.getElementById("output");
var outputMessage = document.getElementById("outputMessage");
var outputData = document.getElementById("outputData");

function drawLine(ctx, begin, end, color) {
    ctx.beginPath();
    ctx.moveTo(begin.x, begin.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
}

// Use facingMode: environment to attemt to get the front camera on phones
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function(stream) {
    video.srcObject = stream;
    video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
    video.play();
    requestAnimationFrame(tick);
});

function tick() {
    loadingMessage.innerText = "⌛ Loading video..."
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        var ctx = videoCanvas.getContext("2d");

        loadingMessage.hidden = true;
        videoCanvas.hidden = false;
        outputContainer.hidden = false;

        videoCanvas.height = video.videoHeight;
        videoCanvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
        var imageData = ctx.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
        var code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });
        if (code) {
            drawLine(ctx, code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
            drawLine(ctx, code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
            drawLine(ctx, code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
            drawLine(ctx, code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");
            outputMessage.hidden = true;
            outputData.parentElement.hidden = false;
            outputData.innerText = code.data;
        } else {
            outputMessage.hidden = false;
            outputData.parentElement.hidden = true;
        }
    }
    requestAnimationFrame(tick);
}

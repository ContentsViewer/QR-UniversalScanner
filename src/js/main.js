import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import jsQR from "jsqr";
// import $ from "jquery";


var video = document.createElement("video");
var videoCanvas = document.getElementById("videoCanvas");
// var outputContainer = document.getElementById("output");
var outputMessage = document.getElementById("outputMessage");
var outputData = document.getElementById("outputData");
var cameraDeviceMessage = document.getElementById('cameraDeviceMessage');
var openCameraButton = document.getElementById('openCameraButton');
var closeCameraButton = document.getElementById('closeCameraButton');
var copyButton = document.getElementById('copyButton');
var copyButtonTooltip = new bootstrap.Tooltip(copyButton);
var pasteButton = document.getElementById('pasteButton');
var clipboardCanvas = document.getElementById('clipboardCanvas')
var clipboardMessage = document.getElementById('clipboardMessage')

var requestCameraClose = false;

new MutationObserver(function () {
    var prevActive = document.getElementById('mode-camera').classList.contains('active');

    return function onAttributesChanged(mutationsList, observer) {
        var target = mutationsList[0].target;
        var active = target.classList.contains('active');

        if (active === prevActive) {
            return;
        }

        if (active) {
            console.log('active')
            if (!video.srcObject) {
                openCameraButton.hidden = false;
                closeCameraButton.hidden = true;
                videoCanvas.hidden = true;
                cameraDeviceMessage.hidden = true;
            }
        }
        else {
            console.log('disactive')
            requestCameraClose = true;
        }
        prevActive = active;
    }
}()).observe(document.getElementById('mode-camera'), { attributes: true })

document.getElementById('mode-clipboard-tab').addEventListener('click', () => {
    clipboardCanvas.hidden = true
    clipboardMessage.hidden = true
})

openCameraButton.addEventListener('click', function () {
    this.hidden = true
    cameraDeviceMessage.textContent = "⌛ Loading video...";
    cameraDeviceMessage.hidden = false
    requestCameraClose = false;

    // Use facingMode: environment to attemt to get the front camera on phones
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
    }).then((stream) => {
        video.srcObject = stream;
        video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
        return video.play();
    }).then(() => {
        requestAnimationFrame(tick);
        closeCameraButton.hidden = false;
    }).catch((e) => {
        console.error(e);
        cameraDeviceMessage.innerHTML = "🎥 Unable to access video stream <br> (please make sure you have a webcam enabled)";
    });
})

closeCameraButton.addEventListener('click', function () {
    this.hidden = true;
    closeCamera();
    videoCanvas.hidden = true;
    openCameraButton.hidden = false;
})

copyButton.addEventListener('click', function () {
    navigator.clipboard.writeText(outputData.innerText
    ).then(() => {
        copyButtonTooltip.show()
        copyButton.classList.remove('btn-outline-secondary')
        copyButton.classList.add('btn-outline-success')
        setTimeout(() => {
            console.log('asa')
            copyButtonTooltip.hide()
            copyButton.classList.add('btn-outline-secondary')
            copyButton.classList.remove('btn-outline-success')
        }, 2000)
    }).catch((e) => {
        console.error(e)
    })
})

pasteButton.addEventListener('click', function () {
    clipboardMessage.hidden = true
    clipboardCanvas.hidden = true

    navigator.clipboard.read().then(data => {
        for (let i = 0; i < data.length; i++) {
            const img = data[i];
            for (const type of img.types) {
                if (type.indexOf('image') != -1) {
                    return img.getType(type)
                }
            }
        }
        throw new Error('NotImage')
    }).then(blob => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function () {
                resolve(img)
            }
            img.src = URL.createObjectURL(blob);
        })
    }).then(img => {
        clipboardCanvas.hidden = false
        let ctx = clipboardCanvas.getContext("2d")
        clipboardCanvas.width = img.width;
        clipboardCanvas.height = img.height;
        ctx.drawImage(img, 0, 0, clipboardCanvas.width, clipboardCanvas.height);

        scanCode(clipboardCanvas)
    }).catch(error => {
        console.error(error)
        if (error.message === "NotImage") {
            clipboardMessage.hidden = false
            clipboardMessage.innerHTML = "Not image"
        }
        else {
            clipboardMessage.hidden = false
            clipboardMessage.innerHTML = "🗒 Unnable to access clipboard <br> (please make sure you enable clipboard access)"
        }
    })
})

/**
 * Note:
 *  * <https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop>
 */
function closeCamera() {
    if (!video.srcObject) {
        return;
    }
    const stream = video.srcObject;
    const tracks = stream.getTracks();

    tracks.forEach(function (track) {
        track.stop();
    });
    video.srcObject = null;
}

function scanCode(canvas) {
    let ctx = canvas.getContext('2d')
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
    });
    if (code) {
        drawLine(ctx, code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
        drawLine(ctx, code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
        drawLine(ctx, code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
        drawLine(ctx, code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");

        sendOutput(code.data)
    }
}


function drawLine(ctx, begin, end, color) {
    ctx.beginPath();
    ctx.moveTo(begin.x, begin.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
}

function tick() {
    if (requestCameraClose) {
        closeCamera();
        return;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        var ctx = videoCanvas.getContext("2d");

        cameraDeviceMessage.hidden = true;
        videoCanvas.hidden = false;

        videoCanvas.height = video.videoHeight;
        videoCanvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);

        scanCode(videoCanvas)
    }
    requestAnimationFrame(tick);
}

var sendOutput = (() => {
    var prevData = null

    return (data) => {
        outputMessage.hidden = true;
        outputData.parentNode.hidden = false;

        if (prevData && prevData === data) {
            return
        }

        outputData.innerText = data;
        console.log(outputData.innerHTML)

        // NOTE:
        //  <https://regexr.com/3um70>
        outputData.innerHTML = outputData.innerHTML.replace(/(https?):\/\/[^\s$.?#].[^\s]*/, (url) => {
            return '<a href="' + url + '" target="_blank">' + url + '</a>'
        })
        prevData = data
    }
})()
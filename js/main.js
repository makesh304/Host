var takeSnapshotUI = createClickFeedbackUI();

var video;
var takePhotoButton;
var toggleFullScreenButton;
var switchCameraButton;
var amountOfCameras = 0;
var currentFacingMode = 'environment';

function deviceCount() {
	return new Promise(function(resolve) {
		var videoInCount = 0;

		navigator.mediaDevices
			.enumerateDevices()
			.then(function(devices) {
				devices.forEach(function(device) {
					if (device.kind === 'video') {
						device.kind = 'videoinput';
					}

					if (device.kind === 'videoinput') {
						videoInCount++;
						console.log('videocam: ' + device.label);
					}
				});

				resolve(videoInCount);
			})
			.catch(function(err) {
				console.log(err.name + ': ' + err.message);
				resolve(0);
			});
	});
}

document.addEventListener('DOMContentLoaded', function(event) {
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && navigator.mediaDevices.enumerateDevices) {
		navigator.mediaDevices
			.getUserMedia({
				audio: false,
				video: true
			})
			.then(function(stream) {
				stream.getTracks().forEach(function(track) {
					track.stop();
				});

				deviceCount().then(function(deviceCount) {
					amountOfCameras = deviceCount;
					initCameraUI();
					initCameraStream();
				});
			})
			.catch(function(error) {
				if (error === 'PermissionDeniedError') {
					alert('Permission denied. Please refresh and give permission.');
				}

				console.error('getUserMedia() error: ', error);
			});
	} else {
		alert('Mobile camera is not supported by browser, or there is no camera detected/connected');
	}
});

function initCameraUI() {
	video = document.getElementById('video');
	findMe();
	takePhotoButton = document.getElementById('takePhotoButton');
	toggleFullScreenButton = document.getElementById('toggleFullScreenButton');
	switchCameraButton = document.getElementById('switchCameraButton');
	takePhotoButton.addEventListener('click', function() {
		takeSnapshotUI();
		takeSnapshot();
	});

	// -- fullscreen part

	function fullScreenChange() {
		if (screenfull.isFullscreen) {
			toggleFullScreenButton.setAttribute('aria-pressed', true);
		} else {
			toggleFullScreenButton.setAttribute('aria-pressed', false);
		}
	}

	if (screenfull.isEnabled) {
		screenfull.on('change', fullScreenChange);

		toggleFullScreenButton.style.display = 'block';

		// set init values
		fullScreenChange();

		toggleFullScreenButton.addEventListener('click', function() {
			screenfull.toggle(document.getElementById('container')).then(function() {
				console.log('Fullscreen mode: ' + (screenfull.isFullscreen ? 'enabled' : 'disabled'));
			});
		});
	} else {
		console.log("iOS doesn't support fullscreen (yet)");
	}

	// -- switch camera part
	if (amountOfCameras > 1) {
		//  switchCameraButton.style.display = 'block';

		switchCameraButton.addEventListener('click', function() {
			if (currentFacingMode === 'environment') currentFacingMode = 'user';
			else currentFacingMode = 'environment';

			initCameraStream();
		});
	}

	window.addEventListener(
		'orientationchange',
		function() {
			// iOS doesn't have screen.orientation, so fallback to window.orientation.
			// screen.orientation will
			if (screen.orientation) angle = screen.orientation.angle;
			else angle = window.orientation;

			var guiControls = document.getElementById('gui_controls').classList;
			var vidContainer = document.getElementById('vid_container').classList;

			if (angle == 270 || angle == -90) {
				guiControls.add('left');
				vidContainer.add('left');
			} else {
				if (guiControls.contains('left')) guiControls.remove('left');
				if (vidContainer.contains('left')) vidContainer.remove('left');
			}
		},
		false
	);
}
function initCameraStream() {
	if (window.stream) {
		window.stream.getTracks().forEach(function(track) {
			console.log(track);
			track.stop();
		});
	}

	// we ask for a square resolution, it will cropped on top (landscape)
	// or cropped at the sides (landscape)
	var size = 1280;

	var constraints = {
		audio: false,
		video: {
			width: { ideal: size },
			height: { ideal: size },
			//width: { min: 1024, ideal: window.innerWidth, max: 1920 },
			//height: { min: 776, ideal: window.innerHeight, max: 1080 },
			facingMode: currentFacingMode
		}
	};

	navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);

	function handleSuccess(stream) {
		window.stream = stream; // make stream available to browser console
		video.srcObject = stream;

		if (constraints.video.facingMode) {
			if (constraints.video.facingMode === 'environment') {
				switchCameraButton.setAttribute('aria-pressed', true);
			} else {
				switchCameraButton.setAttribute('aria-pressed', false);
			}
		}

		const track = window.stream.getVideoTracks()[0];
		const settings = track.getSettings();
		str = JSON.stringify(settings, null, 4);
		console.log('settings ' + str);
		$('#preloader').hide();
	}

	function handleError(error) {
		console.error('getUserMedia() error: ', error);
		$('#preloader').hide();
	}
}

function takeSnapshot() {
	// if you'd like to show the canvas add it to the DOM
	console.log('selected id', imgID);
	var canvas = document.createElement('canvas');

	var width = video.videoWidth;
	var height = video.videoHeight;

	canvas.width = width;
	canvas.height = height;

	context = canvas.getContext('2d');
	context.drawImage(video, 0, 0, width, height);
	function getCanvasBlob(canvas) {
		return new Promise(function(resolve, reject) {
			canvas.toBlob(function(blob) {
				resolve(blob);
			}, 'image/png');
		});
	}

	getCanvasBlob(canvas).then(function(blob) {
		console.log('blob', blob);
    $('#preloader').show();
		var myImage = document.getElementById(imgID);
		var objectURL = URL.createObjectURL(blob);
    console.log('myImage', myImage);
    console.log('objectURL', objectURL);
		myImage.src = objectURL;
		let my_object = {};
		my_object.name = imgNAME;
		my_object.imgID = imgID;
		my_object.img = objectURL;
		Images.push(objectURL);

    ImageUpload(blob);
		if (Images.length == 16) {
		callCompleted();
    $('#preloader').hide();
		}
		console.log('Images', Images);
		// do something with the image blob
	});
}


function createClickFeedbackUI() {

	var overlay = document.getElementById('video_overlay'); //.style.display;

	// sound feedback
	var sndClick = new Howl({ src: [ 'snd/click.mp3' ] });

	var overlayVisibility = false;
	var timeOut = 80;

	function setFalseAgain() {
		overlayVisibility = false;
		overlay.style.display = 'none';
	}

	return function() {
		if (overlayVisibility == false) {
			sndClick.play();
			overlayVisibility = true;
			overlay.style.display = 'block';
			setTimeout(setFalseAgain, timeOut);
		}
	};
}

function getLocationName(lat, lan) {
	//   headers:{
	//     "key":"your key",
	// "Accept":"application/json",//depends on your api
	// "Content-type":"application/x-www-form-urlencoded"//depends on your api
	//  },
	$.ajax({
		url:
			'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
			lat +
			'&longitude=' +
			lan +
			'&localityLanguage=en',
		success: function(response) {
			var datas = JSON.stringify(response);
			let res = JSON.parse(datas);
			console.log('api data', res);
			$('#city').text(res.city);
		}
	});
}
function toSendLoadDetails() {
	var leadID = '32112';
	$.ajax({
		url:
			'http://dev.autobuycrm.com//PaveStatusChange.aspx?source=AUTOBUY&session_key=' +
			leadID +
			'&event=SESSION%3ASTATUS_CHANGE&timestamp=2021-08-31T21%3A54%3A33%2B00%3A00&status=PROCESS',
		success: function(response) {
			var datas = JSON.stringify(response);
			let res = JSON.parse(datas);
			console.log('api data', res);
		}
	});
}
function callCompleted() {
	var leadID = '32112';
	$.ajax({
		url:
			'http://dev.autobuycrm.com//PaveStatusChange.aspx?source=AUTOBUY&session_key=' +
			leadID +
			'&event=SESSION%3ASTATUS_CHANGE&timestamp=2021-08-31T21%3A54%3A33%2B00%3A00&status=COMPLETE',
		success: function(response) {
			var datas = JSON.stringify(response);
			let res = JSON.parse(datas);
			console.log('api data', res);
		}
	});
}
function findMe() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition((position) => {
			//  this.showPosition(position);
			var currentLat = position.coords.latitude;
			var currentLong = position.coords.longitude;
			getLocationName(currentLat, currentLong);
			console.log('position', position);
		});
	} else {
		alert('Geolocation is not supported by this browser.');
	}
}
function Jquryapply() {
	$('#preloader').show();
	$('#imgcontainer').toggleClass('d-none');
	$('#container').toggleClass('d-none');
	$('body,html').toggleClass('overall');
  console.log('imgNAME',imgNAME)
  $('#title').text(imgNAME);
	setTimeout(function() {
		$('#preloader').hide();
	}, 500);
}
function closeCamera() {
	$('#preloader').show();
	//$('#container').hide();
	$('body,html').toggleClass('overall');
	$('#imgcontainer').toggleClass('d-none');
	$('#container').toggleClass('d-none');
	imgID = 'img_';
	setTimeout(function() {
		$('#preloader').hide();
    console.log('iddddddddddd',document.getElementById(imgID))
  document.getElementById(imgID).scrollIntoView({ behavior: "smooth" });

	}, 700);
	toSendLoadDetails();
}
var imgID = 'img_';
var imgNAME = '';
var Images = [];
var imgTypeID='';
function opneCamera(img, name,imgType) {
	imgID = imgID + img;
	imgNAME = name;
  imgTypeID=imgType;
  Jquryapply();
	switch (img) {
		case 1:
			break;

		default:
			break;
	}
}
function blobToFile(theBlob, fileName){
  //A Blob() is almost a File() - it's just missing the two properties below which we will add
    return new File([theBlob], fileName, { lastModified: new Date().getTime(), type: theBlob.type })
}
function ImageUpload(file){
 console.log('file',file)
   var formdata = new FormData();
   let folder='test';
   let leadid='';
let newfilname=imgNAME.replace(/ /g, "-");
   const newfile = blobToFile(file,folder);
   console.log('newfile',newfile)
   formdata.append('file', newfile, newfile.fileName);
   formdata.append('upload_preset', 'qyhxvqkz');
   formdata.append('api_key', '338873942734482');
   formdata.append('api_secret', 'RtP4F9vjfn0f3FqEBuO3GeL3nNE');
   formdata.append('public_id', 'my_folder'+'/'+newfilname)
   formdata.append('Tags', ['autobuy', 'images_lead']);
   var xhr = new XMLHttpRequest();
   var self = this;
   let url='';
   xhr.open('POST', "https://api.cloudinary.com/v1_1/rck-techiees-pvt-ltd/image/upload", true);
   xhr.onload = function () {
     // do something to response
     let annotationsObject = JSON.parse(this.responseText);
     // alert(annotationsObject.response);   
      url = annotationsObject.secure_url;
      console.log('annotationsObject',annotationsObject.height+' '+annotationsObject.width)
      $('#title').text(annotationsObject.height+' '+annotationsObject.width)
      alert('height,width',annotationsObject.height,annotationsObject.width)
    if(url){
     console.log('url',url)
    // self.submit(url);
    }
   
    $('#preloader').hide();
   };
   xhr.onreadystatechange = function (aEvt) {
     if (xhr.readyState == 4) {
       if (xhr.status == 200)
     {
      
      $('#preloader').hide();
     }
     }
     $('#preloader').hide();
   };
   xhr.send(formdata);

}
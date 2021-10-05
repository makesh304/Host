var takeSnapshotUI = createClickFeedbackUI();

var video;
var takePhotoButton;
var toggleFullScreenButton;
var switchCameraButton;
var amountOfCameras = 0;
var currentFacingMode = 'environment';
var leadID='';
var TotalLength=0;
// Object.defineProperty(Images, "push", {
//   configurable: true,
//   enumerable: false,
//   writable: true, // Previous values based on Object.getOwnPropertyDescriptor(Array.prototype, "push")
//   value: function (...args)
//   {
//       let result = Array.prototype.push.apply(this, args); // Original push() implementation based on https://github.com/vuejs/vue/blob/f2b476d4f4f685d84b4957e6c805740597945cde/src/core/observer/array.js and https://github.com/vuejs/vue/blob/daed1e73557d57df244ad8d46c9afff7208c9a2d/src/core/util/lang.js

//       RaiseMyEvent();

//       return result; // Original push() implementation
//   }
// });


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
	$('#preloader').show();
	$('.imgUpload').hide();
	console.log('body top')
  function b64_to_utf8( str ) {
    return decodeURIComponent(escape(window.atob( str )));
  }
  
  var params = getUrlParameter('refid');
  if (params) {
    leadID= b64_to_utf8(params);
	getCheck(leadID);
  }
  console.log('params',params);
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
			orientation_();
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
function orientation_(){
	console.log('orientationchange window',window.orientation)
	if (screen.orientation) {
		if(screen.orientation.type=='landscape-primary'){
			$('#rot_img').hide();
			console.log('orientationchange',screen.orientation.type)
	   }else if (screen.orientation.type=='portrait-primary') {
		$('#rot_img').show();
		console.log('orientationchange',screen.orientation.type)
	   }
	}else{
		if (Math.abs(window.orientation) === 90) {
			$('#rot_img').hide();
		} else {
			$('#rot_img').show();
		}
	}

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
			zoom: true,
		// 	 width: { ideal: size },
		//  height: { ideal: size },
			// width: { min: 1024, ideal: window.innerWidth, max: 1920 },
			// height: { min: 776, ideal: window.innerHeight, max: 1080 },
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
console.log('VIDEO WIDTH',width,'X',height)
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
   // $('#preloader').show();
	//	var myImage = document.getElementById(imgID);
		var objectURL = URL.createObjectURL(blob);
    console.log('imgID',imgID);
    console.log('objectURL', objectURL);
	//	myImage.src = objectURL;
		let my_object = {};
		my_object.name = imgNAME;
		my_object.imgID = imgID;
		my_object.img = objectURL;
		Images.push(my_object);
		console.log('Images pud',Images.length)
ApplyImgLoader();
closeCamera();
console.log('img id imgupload call',imgID);
  ImageUpload(blob,imgID,imgTypeID);
 
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
//   headers: {
//     'Content-Type': 'application/x-www-form-urlencoded'
// },
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
var getUrlParameter = function getUrlParameter(sParam) {
  var sPageURL = window.location.search.substring(1),
      sURLVariables = sPageURL.split('&'),
      sParameterName,
      i;

  for (i = 0; i < sURLVariables.length; i++) {
      sParameterName = sURLVariables[i].split('=');

      if (sParameterName[0] === sParam) {
          return typeof sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
      }
  }
  return false;
};
function toSendLoadDetails(url,imgid,imgTypeID) {
  console.log('https://dev')
//	var leadID = '260886';
	$.ajax({
		type: "POST",
		url:
		'https://appraisalapptest.autobuycrm.com/ABInspect.asmx/AB_Inspect_Webhook',
      contentType: "application/json; charset=utf-8",
	  data: "{'events':'" + 'SESSION:STAGE_CHANGE' + "','photo_url':'" + url  + "','session_key':'" + leadID + "','photo_label':'" + imgNAME + "','source':'" + 'AUTOBUY' + "','message':'" + 'PROCESS' +"','photo_code':'" + imgTypeID + "'  }",
      // headers:{
      //   "Access-Control-Allow-Origin": "http://localhost:4200",
      //   'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      //    },
		success: function(response,textStatus, xhr) {
			var datas = JSON.stringify(response);
			let res = JSON.parse(datas);
			if (xhr.status==200) {
				removeImgLoader(imgid);
				getCheck(leadID);
			
					console.log('Images length', Images.length);
			}
			console.log('api data', res);
			console.log('textStatus data', textStatus,xhr);
		}
	});
}
function callCompleted(status_type) {
	//var leadID = '32112';
	$.ajax({
		type: "POST",
		url:
		'https://appraisalapptest.autobuycrm.com/ABInspect.asmx/AB_StatusChanges',
      contentType: "application/json; charset=utf-8",
	  data: "{'status':'" + status_type + "','session_key':'" + leadID  + "','source':'" + 'AUTOBUY' + "'}",
      // headers:{
      //   "Access-Control-Allow-Origin": "http://localhost:4200",
      //   'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      //    },
		success: function(response,textStatus, xhr) {
			var datas = JSON.stringify(response);
			let res = JSON.parse(datas);
			if (xhr.status==200) {
		//		removeImgLoader(imgid)
			}
			console.log('api data', res);
			console.log('textStatus data', textStatus,xhr);
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
function ApplyImgLoader() {
  
  $('#'+imgID).hide();
  $('#'+imgID+'1').show();
}
function removeImgLoader(imgid){
  $('#'+imgid).show();
  $('#'+imgid+'1').hide();
  console.log('colose cam imgid',imgID);
  console.log('remove',imgid);
}
function Jquryapply(imgname) {
	//$('#preloader').show();
	orientation_();
  console.log('imgname',imgname)
  $('#title').text(imgname);
  $('#leadid').text('#'+leadID);
	setTimeout(function() {
		$('#imgcontainer').toggleClass('d-none');
		$('#container').toggleClass('d-none');
		$('body,html').toggleClass('overall');
		$('#preloader').hide();
	}, 500);
}
function closeCamera() {
	$('#preloader').show();
	$('#vid_container').removeClass('scalprop');
	$('#vidContinner').removeClass('scalprop');
	//$('#container').hide();
	$('body,html').toggleClass('overall');
	$('#imgcontainer').toggleClass('d-none');
	$('#container').toggleClass('d-none');

	setTimeout(function() {
		document.getElementById(imgID).scrollIntoView({ behavior: "smooth" });
		imgID='img_';
		$('#preloader').hide();
		console.log('close cam imgid',imgID)
	
	
	}, 700);
	

  Images= Images.filter(obj => obj.imgID!='img_9');
console.log('new array',Images);

}
var imgID = 'img_';
var imgNAME = '';
var Images = [];
var imgTypeID='';
function opneCamera(img, name,imgType) {
	$('#preloader').show();
	$('#vid_container').addClass('scalprop');
	$('#vidContinner').addClass('scalprop');
	imgID = imgID + img;
	console.log('imgID ,imgTypeID Open cam',imgID,' ',imgTypeID);
	document.getElementById('body').scrollIntoView({ behavior: "smooth" });
	imgNAME = name;
  imgTypeID=imgType;
  Jquryapply(name);
	switch (img) {
		case 1:
			break;

		default:
			break;
	}
}
Images.push = function() { Array.prototype.push.apply(this, arguments);  RaiseMyEvent(this,arguments);};
function RaiseMyEvent(val, arguments){
console.log('',val, arguments);
}
function blobToFile(theBlob, fileName){
  //A Blob() is almost a File() - it's just missing the two properties below which we will add
    return new File([theBlob], fileName, { lastModified: new Date().getTime(), type: theBlob.type })
}
async function ImageUpload(file,imgid,imgTypeID){
// console.log('file',file)
 console.log('img id imgupload inside',imgid);
   var formdata = new FormData();
   let folder='test';
   let leadid='';
let newfilname=imgNAME.replace(/ /g, "-");
   const newfile = blobToFile(file,folder);
   let d = new Date();
   let fielename=leadID+'-'+ imgTypeID+'-'+ d.getMinutes().toString()+d.getSeconds().toString();
   console.log('newfile',newfile)
   formdata.append('file', newfile, fielename);
   formdata.append('upload_preset', 'qyhxvqkz');
   formdata.append('api_key', '338873942734482');
   formdata.append('api_secret', 'RtP4F9vjfn0f3FqEBuO3GeL3nNE');
   formdata.append('public_id', leadID.toString()+'/'+fielename)
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
      console.log('annotationsObject imgID imgTypeID',imgid,' ',imgTypeID);
      
	  toSendLoadDetails(url,imgid,imgTypeID); 
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
function getCheck(){
	$.ajax({
		type: "POST",
		url:
		'https://appraisalapptest.autobuycrm.com/ABInspect.asmx/ABSession_check',
      contentType: "application/json; charset=utf-8",
	  data: "{'leadid':'" + leadID + "'}",
      // headers:{
      //   "Access-Control-Allow-Origin": "http://localhost:4200",
      //   'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      //    },
		success: function(response,textStatus, xhr) {
			//var datas = JSON.stringify(response.d);
			var datas = response["d"];
			let res = JSON.parse(datas);
	
			if (xhr.status==200) {
				//res.STATUS
				TotalLength=res.length;
				console.log('	res xh',	res.length);
				if (res.length!=0) {
					if (res[0].status=='' || res[0].status==' ') {
						callCompleted('STARTED');
						$('#preloader').hide();
						}	
					if (TotalLength == 5) {
						callCompleted('COMPLETE');
					$('#preloader').hide();
						}

					// if (res[0].status=='COMPLETE') {
					// 	$("#staticBackdrop").modal('show');
					// }else{
						res.forEach(element => {
							if (element.imgtype=='017') {
								$("#img_9").attr("src",element.imgurl);
							}
							else if (element.imgtype=='028') {
								$("#img_5").attr("src",element.imgurl);
							}
							else	if (element.imgtype=='001') {
								$("#img_3").attr("src",element.imgurl);
							}
							else	if (element.imgtype=='004') {
								$("#img_15").attr("src",element.imgurl);
							}
							else	if (element.imgtype=='005') {
								$("#img_4").attr("src",element.imgurl);
							}
							else	if (element.imgtype=='007') {
								$("#img_8").attr("src",element.imgurl);
							}
							else	if (element.imgtype=='010') {
								$("#img_6").attr("src",element.imgurl);
							}
							else	if (element.imgtype=='018') {
								$("#img_10").attr("src",element.imgurl);
							}
							else	if (element.imgtype=='025') {
								$("#img_13").attr("src",element.imgurl);
							}
							else	if (element.imgtype=='002') {
								$("#img_14").attr("src",element.imgurl);
							}
							else	if (element.imgtype=='004') {
								$("#img_16").attr("src",element.imgurl);
							}
						});
					//}
					console.log('api statu', 		res[0].status);
				$('#preloader').hide();
				}else{
					$('#preloader').hide();
				}
		//		removeImgLoader(imgid)
		//$("#staticBackdrop").modal('show');
			}else{
				$('#preloader').hide();
			}

		}
	});
}

function ready() {
	const { type } = screen.orientation;
	console.log(`Fullscreen and locked to ${type}. Ready!`);
  }
  
  async function start() {
	await document.body.requestFullscreen();
	await screen.orientation.lock("landscape");
	ready();
  }
// function displayLocation(latitude,longitude){
// 	var request = new XMLHttpRequest();

// 	var method = 'GET';
// 	var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng='+latitude+','+longitude+'&sensor=true&key=AIzaSyD3udcFif_D8ht0cLH6Mhgs4XuDfHecO5s';
// 	var async = true;

// 	request.open(method, url, async);
// 	request.onreadystatechange = function(){
// 	  if(request.readyState == 4 && request.status == 200){
// 		var data = JSON.parse(request.responseText);
// 		var address = data.results[0];
// 		console.log('address',address);
// 	  }
// 	};
// 	request.send();
//   };

//   var successCallback = function(position){
// 	var x = position.coords.latitude;
// 	var y = position.coords.longitude;
// 	displayLocation(x,y);
//   };

//   var errorCallback = function(error){
// 	var errorMessage = 'Unknown error';
// 	switch(error.code) {
// 	  case 1:
// 		errorMessage = 'Permission denied';
// 		break;
// 	  case 2:
// 		errorMessage = 'Position unavailable';
// 		break;
// 	  case 3:
// 		errorMessage = 'Timeout';
// 		break;
// 	}
// 	document.write(errorMessage);
//   };

//   var options = {
// 	enableHighAccuracy: true,
// 	timeout: 1000,
// 	maximumAge: 0
//   };

//   navigator.geolocation.getCurrentPosition(successCallback,errorCallback,options)


//   var x=document.getElementById("demo");
// function getLocation(){
//     if (navigator.geolocation){
//         navigator.geolocation.getCurrentPosition(showPosition,showError);
//     }
//     else{
//         x.innerHTML="Geolocation is not supported by this browser.";
//     }
// }

// function showPosition(position){
//     lat=position.coords.latitude;
//     lon=position.coords.longitude;
//     displayLocation(lat,lon);
// }

// function showError(error){
//     switch(error.code){
//         case error.PERMISSION_DENIED:
//             x.innerHTML="User denied the request for Geolocation."
//         break;
//         case error.POSITION_UNAVAILABLE:
//             x.innerHTML="Location information is unavailable."
//         break;
//         case error.TIMEOUT:
//             x.innerHTML="The request to get user location timed out."
//         break;
//         case error.UNKNOWN_ERROR:
//             x.innerHTML="An unknown error occurred."
//         break;
//     }
// }

// function displayLocation(latitude,longitude){
//     var geocoder;
//     geocoder = new google.maps.Geocoder();
//     var latlng = new google.maps.LatLng(latitude, longitude);

//     geocoder.geocode(
//         {'latLng': latlng}, 
//         function(results, status) {
//             if (status == google.maps.GeocoderStatus.OK) {
//                 if (results[0]) {
// 					console.log('results[0]',results[0]);
//                     var add= results[0].formatted_address ;
//                     var  value=add.split(",");

//                     count=value.length;
//                     country=value[count-1];
//                     state=value[count-2];
//                     city=value[count-3];
//                     x.innerHTML = "city name is: " + city;
//                 }
//                 else  {
//                     x.innerHTML = "address not found";
//                 }
//             }
//             else {
//                 x.innerHTML = "Geocoder failed due to: " + status;
//             }
//         }
//     );
// }
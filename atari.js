ALE = {};
Module = {};

(function(Module, ALE) {

function wrap_ale(Module) {
	var ALE = {}
	ALE.ALE_new = Module.cwrap('ALE_new', null, [])
	ALE.loadROM =  Module.cwrap('loadROM', null, ['number', 'string'])

	ALE._getMinimalActionSize = Module.cwrap('getMinimalActionSize', 'number', ['number'])
	ALE._getMinimalActionSet  = Module.cwrap('getMinimalActionSet', null, ['number', 'number'])

	ALE.getMinimalActionSet = function(ale) {
		var n = _getMinimalActionSize(ale)

		var buf_len = n*Module.HEAP32.BYTES_PER_ELEMENT
		var buf = Module._malloc(buf_len)
		_getMinimalActionSet(ale, buf)

		var ret = Module.HEAP8.slice(buf, buf+buf_len)
		ret = new Int32Array(ret.buffer)

		Module._free(buf)
		return ret
	}

	ALE.getScreenWidth  = Module.cwrap('getScreenWidth',  'number', ['number'])
	ALE.getScreenHeight = Module.cwrap('getScreenHeight', 'number', ['number'])

	ALE._getScreenGrayscale = Module.cwrap('getScreenGrayscale', 'number', ['number', 'number'])
	ALE._getScreenRGB = Module.cwrap('getScreenRGB', 'number', ['number', 'number'])

	ALE.getScreenGrayscale = function() {
		var h = getScreenHeight(ale);
		var w = getScreenWidth(ale);

		var buf_len = h*w;
		var buf = Module._malloc(buf_len)

		_getScreenGrayscale(ale, buf)

		var ret = Module.HEAP8.slice(buf, buf+buf_len)
		Module._free(buf)
		return ret
	}

	ALE.act = Module.cwrap('act', 'number', ['number', 'number'])

	return ALE
}

function writeScreen(screen, data) {
	var data_len = data.length
	for (var i = 0; i < data_len; i++) {
		data[4*i]     = screen[i]; // red
		data[4*i + 1] = screen[i]; // green
		data[4*i + 2] = screen[i]; // blue
		data[4*i + 3] = 255;
	}
}

function onRuntimeInitialized() {
	var ALE = wrap_ale(Module)
	var gray2rgba = Module.cwrap('gray2rgba', null, ['number', 'number', 'number'])
	var rgb2rgba  = Module.cwrap('rgb2rgba',  null, ['number', 'number', 'number'])

	var ale = ALE.ALE_new();
	ALE.loadROM(ale, 'space_invaders.bin')

	console.log(ALE.getScreenHeight(ale))
	console.log(ALE.getScreenWidth(ale))
	console.log(ALE.getMinimalActionSet(ale))

	var canvas = document.getElementById("canvas")
	var ctx = canvas.getContext("2d")

	var canvas_small = document.getElementById("canvas-small")
	var ctx_small = canvas_small.getContext("2d")

	var canvas_rgb = document.getElementById("canvas-rgb")
	var ctx_rgb = canvas_rgb.getContext("2d")


	var imageData = ctx.createImageData(160, 210)
	// var buf = new ArrayBuffer(imageData.data.length);
	// var buf8 = new Uint8Array(buf);
	var buf8_ptr = Module._malloc(imageData.data.length);

	var h = ALE.getScreenHeight(ale);
	var w = ALE.getScreenWidth(ale);

	var screen_len = h*w;
	var screen_ptr = Module._malloc(screen_len)

	var screen_rgb_ptr = Module._malloc(3*screen_len)

	assert(imageData.data.length == 4*screen_len)

	var data = imageData.data

	var input = new Float32Array(84*84)
	window.input = input

	var draw = function() {
		ALE.act(ale, 1);

		// var screen = getScreenGrayscale(ale);
		// writeScreen(screen, data);

		ALE._getScreenGrayscale(ale, screen_ptr)
		gray2rgba(screen_len, screen_ptr, buf8_ptr)
		var rgba = Module.HEAPU8.subarray(buf8_ptr, buf8_ptr + imageData.data.length)
		imageData.data.set(rgba);

		ctx.putImageData(imageData, 0, 0);
		ctx_small.drawImage(canvas, 0, 0, 160, 210, 0, -18, 84, 110)

		ALE._getScreenRGB(ale, screen_rgb_ptr)
		rgb2rgba(screen_len, screen_rgb_ptr, buf8_ptr)
		var rgba = Module.HEAPU8.subarray(buf8_ptr, buf8_ptr + imageData.data.length)
		imageData.data.set(rgba);
		ctx_rgb.putImageData(imageData, 0, 0);

		var imageData_small = ctx_small.getImageData(0, 0, 84, 84)
		var small_data = imageData_small.data
		for(var i = 0; i < screen_len; i++) {
			input[i] = small_data[4*i]
		}
	}

	var redraw = function() {
		draw()
		window.requestAnimationFrame(redraw)
	}

	redraw()
}

Module.onRuntimeInitialized = onRuntimeInitialized;

})(Module, ALE);
/**
decode.js

decode aigis data and send it back to the extension
adapted for javascript from original code by lzlis
**/

aigishelper.decode = (function() {
	
	function find_key(view) {
		for(let start of ["<?xml version=\"", "<DA>"]) {
			let sb1 = start.charCodeAt(0);
			for(let i = 0; i < Math.min(100, view.byteLength); i++) {
				let b1 = view.getUint8(i);
				var test = true;
				
				for(let j = 1; j < start.length; j++) {
					let testval = b1 ^ view.getUint8(i + j);
					let canon = sb1 ^ start.charCodeAt(j);
					if(testval != canon) {
						test = false;
						break;
					}
				}
				
				if(test) {
					return sb1 ^ b1;
				}
			}
		}
	}


	function decode(view) {
		let decoded = new DataView(new ArrayBuffer(view.byteLength));
		let key = find_key(view);
		
		for(let j = 0; j < view.byteLength; j++) {
			let b = view.getUint8(j) ^ key;
			decoded.setUint8(j, b);
		}
		
		return decoded;
	}
	
	return decode;
	
})();

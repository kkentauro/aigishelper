/**
decompress.js

adapted for javascript from original <s>sorcery</s>code by lzlis
**/

aigishelper.decompress = (function() {
	
	class DataStorage {
		
		constructor() {
			this.tail = "";
			this.buffer = [];
		}
		
		byte(idx) {
			if(idx <= 0) {
				idx += this.length;
			}
			
			let section = Math.floor(idx / 256);
			
			if(section >= this.buffer.length) {
				return this.tail.charCodeAt(idx & 255);
			}
			return this.buffer[section].charCodeAt(idx & 255);
		}
		
		add(byte) {
			this.tail += String.fromCharCode(byte);
			if(this.tail.length == 256) {
				this.buffer.push(this.tail);
				this.tail = "";
			}
		}
		
		toString() {
			return String.prototype.concat(... this.buffer, this.tail);
		}
		
		get length() {
			return (this.buffer.length << 8) + this.tail.length;
		}
	}
	
	
	let lookup = (function lookup() {
		let lookup_hex = `01 00 04 08 01 10 01 20 02 00 05 08 02 10 02 20 03 00 06 08 03 10 03 20 04 00 07 08 04 10 04 20 05 00 08 08 05 10 05 20 06 00 09 08 06 10 06 20 07 00 0A 08 07 10 07 20 08 00 0B 08 08 10 08 20 09 00 04 09 09 10 09 20 0A 00 05 09 0A 10 0A 20 0B 00 06 09 0B 10 0B 20 0C 00 07 09 0C 10 0C 20 0D 00 08 09 0D 10 0D 20 0E 00 09 09 0E 10 0E 20 0F 00 0A 09 0F 10 0F 20 10 00 0B 09 10 10 10 20 11 00 04 0A 11 10 11 20 12 00 05 0A 12 10 12 20 13 00 06 0A 13 10 13 20 14 00 07 0A 14 10 14 20 15 00 08 0A 15 10 15 20 16 00 09 0A 16 10 16 20 17 00 0A 0A 17 10 17 20 18 00 0B 0A 18 10 18 20 19 00 04 0B 19 10 19 20 1A 00 05 0B 1A 10 1A 20 1B 00 06 0B 1B 10 1B 20 1C 00 07 0B 1C 10 1C 20 1D 00 08 0B 1D 10 1D 20 1E 00 09 0B 1E 10 1E 20 1F 00 0A 0B 1F 10 1F 20 20 00 0B 0B 20 10 20 20 21 00 04 0C 21 10 21 20 22 00 05 0C 22 10 22 20 23 00 06 0C 23 10 23 20 24 00 07 0C 24 10 24 20 25 00 08 0C 25 10 25 20 26 00 09 0C 26 10 26 20 27 00 0A 0C 27 10 27 20 28 00 0B 0C 28 10 28 20 29 00 04 0D 29 10 29 20 2A 00 05 0D 2A 10 2A 20 2B 00 06 0D 2B 10 2B 20 2C 00 07 0D 2C 10 2C 20 2D 00 08 0D 2D 10 2D 20 2E 00 09 0D 2E 10 2E 20 2F 00 0A 0D 2F 10 2F 20 30 00 0B 0D 30 10 30 20 31 00 04 0E 31 10 31 20 32 00 05 0E 32 10 32 20 33 00 06 0E 33 10 33 20 34 00 07 0E 34 10 34 20 35 00 08 0E 35 10 35 20 36 00 09 0E 36 10 36 20 37 00 0A 0E 37 10 37 20 38 00 0B 0E 38 10 38 20 39 00 04 0F 39 10 39 20 3A 00 05 0F 3A 10 3A 20 3B 00 06 0F 3B 10 3B 20 3C 00 07 0F 3C 10 3C 20 01 08 08 0F 3D 10 3D 20 01 10 09 0F 3E 10 3E 20 01 18 0A 0F 3F 10 3F 20 01 20 0B 0F 40 10 40 20`;
		
		let regex = /([0-9a-fA-F]{2})\s/g;
		let replace_function = function(hex_value) {
			let decimal_value = parseInt(hex_value, 16);
			return String.fromCharCode(decimal_value);
		};
		
		return lookup_hex.replace(regex, replace_function);
	})();
	
	
	function decompress(view) {
		let i = 0;
		let data = new DataStorage();
		
		// parse size
		let size = 0;
		let bits = 0;
		
		while(true) {
			let n = view.getUint8(i);
			if(bits + 7 < 32) {
				size |= (n & 0x7f) << bits;
				bits += 7;
				i++;
				
				if((n & 0x80) == 0) {
					break;
				}
				
			} else {
				assert(n < 16);
				size |= n << bits;
				bits += 4;
				i++;
				assert(bits == 32);
				break;
			}
		}
		
		// parse contents
		while(true) {
			if(i >= view.byteLength) {
				break;
			}
			
			let b = view.getUint8(i++);
			let low = b & 0b11;
			
			if(low > 0) {
				let lookup_value = lookup.charCodeAt(b << 1)
					| (lookup.charCodeAt((b << 1) + 1) << 8);
				
				let len = lookup_value >> 11;
				let lz_offset = 0;
				let shift = 0;
				
				while(len > 0) {
					lz_offset |= view.getUint8(i) << shift;
					i++;
					shift += 8;
					len--;
				}
				
				lz_offset += lookup_value & 0x0700;
				let lz_length = lookup_value & 0xff;
				
				for(let _ = 0; _ < lz_length; _++) {
					data.add(data.byte(-lz_offset));
				}
			} else {
				b >>= 2;
				
				if(b >= 60) {
					let len = b - 59;
					b = 0;
					let shift = 0;
					
					while(len > 0) {
						b |= view.getUint8(i) << shift;
						i++;
						shift += 8;
						len--;
					}
				}
				
				b++;
				
				for(let j = 0; j < b; j++) {
					data.add(view.getUint8(i + j));
				}
				
				i += b;
			}
		}
		
		let decompressed = data.toString();
		assert(decompressed.length == size);
		return decompressed;
	}
	
	return decompress;
	
})();

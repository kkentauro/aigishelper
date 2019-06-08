/**
alar.js

parse AigisLib archive files
**/


aigislib.ALAR = (function() {
	
	class ALAREntry {
		constructor() {
			this.filename = "";
			this.index = 0;
			this.address = 0;
			this.size = 0;
			this.alobj = null;
		}
		
		clone() {
			let alarentry = new ALAREntry();
			
			alarentry.filename = this.filename;
			alarentry.index    = this.index;
			alarentry.address  = this.address;
			alarentry.size     = this.size;
			alarentry.alobj    = this.alobj.clone();
			
			return alarentry;
		}
	}
	

	class ALAR extends aigislib.ALObject {
		
		constructor() {
			super();
			this.entries = [];
		}
		
		clone() {
			let alar = new this.constructor();
			
			alar.entries = $.map(this.entries, alarentry =>
				alarentry.clone());
			alar.textures = $.map(this.textures, altx =>
				altx.clone());
			
			return alar;
		}
		
		static parse(stream) {
			let version = stream.readUint8FromPosition(stream.position + 4);
			
			if(version == 2) {
				return ALARv2.parse(stream);
			} else if(version == 3) {
				return ALARv3.parse(stream);
			} else {
				throw new Error("unknown ALAR version");
			}
		}
		
		write_to_stream(stream) {
			throw "write_to_stream not implemented for ALAR";
		}
		
		patch(context) {
			let alar = this.clone();
			
			for(let entry of alar.entries) {
				aigishelper.make_patch_context(context.root, entry.filename)
					.then(child_context => entry.alobj.patch(child_context));
			}
			
			return alar;
		}		
	}
	
	// ===================================================================
	
	function parse_data(stream, alar) {
		for(let entry of alar.entries) {
			let match = entry.filename.match(/\.(?<ext>[^\.]*)$/);
			let extension = match.groups["ext"];
			let result;
			
			if(extension === "txt" || extension === "lua") {
				// TODO: this needs some work
				let text = "";
				let start = entry.address;
				
				for(let i = start; i < start + entry.size; i++) {
					let byte = stream.readUint8FromPosition(i);
					text += String.fromCharCode(byte);
				}
				
				result = {type: "TEXT", text: text};
			} else {
				// TODO: make a way to do this without jumps
				let position = stream.position;

				stream.jumpTo(entry.address);
				result = aigislib.parse_object(stream);
				stream.jumpTo(position);
				
				entry.alobj = result;
			}
		}
	}
	
	function write_data(stream, alar) {
		for(let entry of alar.entries) {
			let match = entry.filename.match(/\.(?<ext>[^\.]*)$/);
			let extension = match.groups["ext"];
			
			if(extension == "txt" || extension == "lua") {
				throw "lazy, didn't implement writing txt yet";
			} else {
				let position = stream.position;

				stream.jumpTo(entry.address);
				stream.writeALObject(entry.alobj);
				stream.jumpTo(position);
			}
		}
	}
	
	// ===================================================================
	
	let ALARv2 = (function() {
		
		function parse_toc_entry(stream) {
			let entry = new ALAREntry();
			
			entry.index = stream.readUint16();
			stream.seek(+2); // ???
			entry.address = stream.readUint32();
			entry.size = stream.readUint32();
			stream.seek(+4); // ???
			
			let offset = stream.start_offset + entry.address - 0x22;
			entry.filename = stream.readNullTerminatedStringFromPosition(offset);
			
			return entry;
		}
		
		class ALARv2 extends ALAR {
			
			clone() {
				return super.clone();
			}
			
			static parse(stream) {
				let alar = new ALARv2();
				
				stream.seek(+6); // ???
				let record_count = stream.readUint16();
				stream.seek(+8); // ???
				
				for(let i = 0; i < record_count; i++) {
					alar.entries.push(parse_toc_entry(stream));
				}
				
				parse_data(stream, alar);
				return alar;
			}
			
			write_to_stream(stream) {
				stream.writeString("ALAR");
				stream.writeUint8 (2);
				stream.writeString("\0");
				stream.writeUint16(this.entries.length);
				stream.writeString("\0\0\0\0\0\0\0\0");
				
				let first_entry = 0;
				for(let entry of this.entries) {
					stream.writeUint16(entry.index);
					stream.writeString("\0\0");
					stream.writeUint32(entry.address);
					stream.writeUint32(entry.size);
					stream.writeString("\0\0\0\0");
					
					let offset = stream.start_offset + entry.address - 0x22;
					first_entry = first_entry || offset;
					stream.writeStringAtPosition(offset, entry.filename);
					stream.writeUint8AtPosition(offset + entry.filename.length, 0);
				}
				
				while(stream.position < first_entry) {
					stream.writeUint8(0);
				}
				
				write_data(stream, this);
			}
			
			patch(context) {
				return super.patch(context);
			}
			
			
		}
		
		return ALARv2;
	})();
	
	// ===================================================================
	
	let ALARv3 = (function() {
		
		function parse_toc_entry(stream) {
			let entry = new ALAREntry();
			
			entry.index = stream.readUint16();
			stream.seek(+2); // ???
			entry.address = stream.readUint32();
			entry.size = stream.readUint32();
			stream.seek(+6); // ???
		 
			entry.filename = stream.readNullTerminatedString();
			stream.align(4)
			
			return entry;
		}
		
		class ALARv3 extends ALAR {
			
			clone() {
				return super.clone();
			}
			
			static parse(stream) {
				let alar = new ALARv3();
				
				stream.seek(+6); // ???
				let record_count = stream.readUint16();
				
				this.unk0 = stream.readUint16(); // ???
				this.unk1 = stream.readUint16(); // ???
				stream.seek(+4); // ???
				
				this.data_offset = stream.readUint16();
				
				this.toc_offsets = [];
				for(let _ = 0; _ < record_count; _++) {
					this.toc_offsets.push(stream.readUint16()); // ?????????
				}
				
				stream.align(4);
				
				for(let i = 0; i < record_count; i++) {
					alar.entries.push(parse_toc_entry(stream));
				}
				
				parse_data(stream, alar);
				return alar;
			}
			
			write_to_stream(stream) {
				stream.writeString("ALAR");
				stream.writeUint8 (3);
				stream.writeString("\0");
				stream.writeUint16(this.entries.length);
				stream.writeString("\0\0\0\0\0\0\0\0");
				stream.writeUint16(this.unk0);
				stream.writeUint16(this.unk1);
				stream.writeString("\0\0\0\0");
				stream.writeUint16(this.data_offset);
				
				for(let offset of this.toc_offsets) {
					stream.writeUint16(offset);
				}
				
				stream.align(4);
				
				for(let entry of this.entries) {
					stream.writeUint16(entry.index);
					stream.writeString("\0\0");
					stream.writeUint32(entry.address);
					stream.writeUint32(entry.size);
					stream.writeString("\0\0\0\0\0\0");
					stream.writeString(entry.filename);
					stream.writeUint8(0);
					stream.writeString("\0\0\0\0");
				}
				
				write_data(stream, this);
			}
			
			patch(context) {
				return super.patch(context);
			}
			
		}
		
		return ALARv3;
	})();
	
	
	// ===================================================================
	
	return ALAR;
	
})();


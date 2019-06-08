/**
altb.js

parse AigisLib table files


ALTB format
|--------------------------------------------------------------------------
| "ALTB" | version |  form  |  count  |   ???   | entry offset |   size   |
| 4 bytes|  1 byte | 1 byte | 2 bytes | 2 bytes |    2 bytes   | 4 bytes  | ...
|--------------------------------------------------------------------------
    ------------------------------------------------------------------
    | strings size | strings start | names start |  label  |  header |
    |    4 bytes   |    4 bytes    |   4 bytes   | 4 bytes | n bytes | ...
    ------------------------------------------------------------------
    --------------------------------------------|
    | entries | strings |   ???   | name length |
    | n bytes | n bytes | 4 bytes |   1 byte    |
    --------------------------------------------|
version: 1
form: bit field
  - 0x01: unused??
  - 0x02: used but ????
  - 0x04: includes strings
  - 0x08: includes names
  - 0x10: includes label
  known forms: 0x4 0x10 0x14 0x1e
  others? 1C may appear in ALLZ test_mission\test08.bin
count: number of things
unk1: header length?
entry_offset: offset from start_offset where thing data is (after "header")
size: bytes in each thing
strings_size: size of the strings section
strings_start: offset from start_offset where thing data ends
label: 4 byte descriptive of what "header" represents
header: describes the contents of each thing

04 00100 strings
10 10000 none
14 10100 strings
1e 11110 strings, names
**/

aigislib.ALTB = class extends aigislib.ALObject {
	
	constructor() {
		super();
		this.header = new aigislib.ALRD();
		this.entries = [];
		this.strings = [];
		
		this.version = 0;
		this.form = 0;
		this.count = 0;
		this.unk1 = 0;
		this.entry_offset = 0;
		this.size = 0;
		this.strings_start = 0;
		this.strings_size = 0;
		this.names_start = 0;
		this.unk_names = 0;
		this.name_len = 0;
		this.label = "";
	}
	
	clone() {
		let altb = new aigislib.ALTB();
		
		altb.header = this.header.clone();
		altb.entries = $.map(this.entries, entry => [entry.slice()]);
		altb.strings = this.strings.slice();
		
		altb.version       = this.version;
		altb.form          = this.form;
		altb.count         = this.count;
		altb.unk1          = this.unk1;
		altb.entry_offset  = this.entry_offset;
		altb.size          = this.size;
		altb.strings_start = this.strings_start;
		altb.strings_size  = this.strings_size;
		altb.names_start   = this.names_start;
		altb.unk_names     = this.unk_names;
		altb.name_len      = this.name_len;
		altb.label         = this.label;
		
		return altb;
	}
	
	static parse(stream) {
		let altb = new aigislib.ALTB();
		// TODO: assert this
		let form_map = {0x04: 0x18, 0x10: 0x14, 0x14: 0x1c, 0x1e: 0x20};
		
		stream.seek(+4); // "ALTB"
		altb.version = stream.readUint8();
		altb.form = stream.readUint8();
		altb.count = stream.readUint16();
		altb.unk1 = stream.readUint16();
		altb.entry_offset = stream.start_offset + stream.readUint16();
		altb.size = stream.readUint32();
		
		assert(altb.version == 1,
			"only altb version 1 supported");
		assert(altb.form in form_map,
			"unknown altb form", altb.form.toString(16));
		assert(altb.unk1 == form_map[altb.form],
			"incorrect unk1 value for form", altb.form.toString(16));
		
		if(altb.form & 0x04) {
			altb.strings_size = stream.readUint32();
			altb.strings_start = stream.start_offset + stream.readUint32();
		}
		
		if(altb.form & 0x08) {
			altb.names_start = stream.readUint32();
		}
		
		if(altb.form & 0x10) {
			altb.label = stream.readString(4);
		}
		
		altb.header = aigislib.ALRD.parse(stream);
		stream.align(4);
		
		assert(stream.position == altb.entry_offset,
			"stream misaligned with altb entry offset");
		
		// read things
		for(let _ = 0; _ < altb.count; _++) {
			let entry = [];
			for(let attr of Object.values(altb.header.entries)) {
				let offset = stream.position + attr.offset;
				
				switch(attr.type) {
					case 1:
						entry.push(stream.readInt32FromPosition(offset));
						break;
					case 4:
						entry.push(stream.readFloat32FromPosition(offset));
						break;
					case 5:
						entry.push(stream.readUint8FromPosition(offset));
						break;
					case 32:
						let val = stream.readInt32FromPosition(offset);
						entry.push(val);
						
						if(altb.strings_start) {
							let str = stream.readNullTerminatedStringFromPosition(altb.strings_start + val);
							if(str.length != 0) { // TODO: can this happen??
								altb.strings.push(str);
							}
						}
						
						break;
					case 9: // StartDateTime????
					case 97: // ability link?
						break;
					default:
						debugger;
						throw new Error("unknown record type" + attr.type);
				}
				
			}
			
			altb.entries.push(entry);
			stream.seek(+altb.size);
		}
		
		stream.align(4);
		
		if(altb.strings_start) {
			assert(stream.position == altb.strings_start,
				"stream misaligned with altb strings section start");
			stream.seek(+altb.strings_size);
			stream.align(4);
		}
		
		if(altb.names_start) {
			altb.unk_names = stream.readUint32();
			assert(altb.unk_names == 1, "altb unk_names is not 1");
			
			let name_len = stream.readUint8();
			altb.name = stream.readString(name_len);
			stream.align(4);
		}
		
		return altb;
	}
	
	write_to_stream = (function() {
		
		function write_header(self, stream) {
			// write ALTB header
			stream.writeString("ALTB");
			stream.writeUint8 (self.version);
			stream.writeUint8 (self.form);
			stream.writeUint16(self.count);
			stream.writeUint16(self.unk1);
			stream.writeUint16(self.entry_offset);
			stream.writeUint32(self.size);
			
			if(self.form & 0x04) {
				stream.writeUint32(self.strings_size);
				stream.writeUint32(self.strings_start);
			}
			
			if(self.form & 0x08) {
				stream.writeUint32(self.names_start);
			}
			
			if(self.form & 0x10) {
				stream.writeString(self.label);
			}
			
			stream.writeALObject(self.header)
		}
		
		function write_strings(self, stream) {
			if(!(self.form & 0x04)) {
				return;
			}
			
			assert(stream.position == stream.start_offset + self.strings_start,
				"stream not positioned correctly to write altb strings section");
			stream.writeUint8(0);
			
			for(let i = 0; i < self.strings.length; i++) {
				stream.writeString(self.strings[i]);
				stream.writeUint8(0);
			}
			
			assert(stream.position == stream.start_offset + self.strings_start + self.strings_size,
				"altb strings section incorrect size");
			stream.align(4);
		}
		
		function write_footer(self, stream) {
			if(!(self.form & 0x08)) {
				return;
			}
			
			stream.writeUint32(self.unk_names);
			stream.writeUint8 (self.name_len);
			stream.align(4);
		}
		
		function write_to_stream(stream) {
			write_header(this, stream);
			
			for(let entry of this.entries) {
				for(let i = 0; i < this.header.entries.length; i++) {
					let attr = this.header.entries[i];
					
					switch(attr.type) {
						case 1:
						case 32:
							stream.writeInt32(entry[i]);
							break;
						case 4:
							stream.writeFloat32(entry[i]);
							break;
						case 5:
							stream.writeUint8(entry[i]);
							break;
						case 9: // StartDateTime???
						case 97: // ????
							break;
						default:
							throw "unknown data type: " + attr.type;
					}
				}
			}
			
			stream.align(4);
			write_strings(this, stream);
			write_footer(this, stream);
		}
		
		return write_to_stream;
	})();
	
	patch(context) {
		let altb = new aigislib.ALTB();
		
		altb.header        = this.header.clone();
		altb.version       = this.version;
		altb.form          = this.form;
		altb.count         = this.count;
		altb.unk1          = this.unk1;
		altb.entry_offset  = this.entry_offset;
		altb.size          = this.size;
		altb.strings_start = this.strings_start;
		altb.names_start   = this.names_start;
		altb.unk_names     = this.unk_names;
		altb.name_len      = this.name_len;
		altb.label         = this.label;
		altb.strings_size  = 1; // starts at 1
		
		// translate strings and add up their length for offsets
		let patched_offsets = [1];
		for(let i = 0; i < this.strings.length; i++) {
			// add next patched string
			let base_str = this.strings[i];
			let utf8str = aigishelper.ascii_to_utf8(base_str);
			let translated_str = context.translate_string(utf8str);
			let asciistr = aigishelper.utf8_to_ascii(translated_str);
			altb.strings.push(asciistr);
			
			// add next patched offset
			let last_offset = patched_offsets[patched_offsets.length - 1];
			let str_len = asciistr.length + 1; // null-terminated
			let new_offset = last_offset + str_len;
			
			altb.strings_size += str_len;
			patched_offsets.push(new_offset);
		}
		
		// find all original string offsets
		let offsets = new Set([0]);
		for(let i = 0; i < this.header.entries.length; i++) {
			let attr = this.header.entries[i];
			if(attr.type != 32) { continue; }
			this.entries.forEach((entry) => offsets.add(entry[i]));
		}
		
		// 0 isn't a real offset
		offsets.delete(0);
		
		// build reverse map
		let sorted = new Array(...offsets.values()).sort((a, b) => a - b);
		let reverse_map = {};
		sorted.forEach((k, v) => reverse_map[k] = v);
		
		for(let i = 0; i < this.entries.length; i++) {
			let entry = [];
			let skipped = 0;
			
			for(let j = 0; j < this.header.entries.length; j++) {
				let attr = this.header.entries[j];
				let offset = this.entries[i][j - skipped];
				
				if(attr.type != 32) {
					if(attr.type == 97) {
						skipped++;
					} else {
						entry.push(offset);
					}
					
					continue;
				}
				
				if(offset == 0) {
					entry.push(0);
				} else {
					entry.push(patched_offsets[reverse_map[offset]]);
				}
			}
			
			altb.entries.push(entry);
		}
		
		assert(this.strings.length == altb.strings.length,
			"new altb strings section mismatch");
		return altb;
	}
	
}


/**
alrd.js

parse AigisLib record files

ALRD Header
|----------------------------------------------|
| "ALRD" |   ???   |  count |   ???  |   size  |
| 4 bytes| 2 bytes | 1 byte | 1 byte | 2 bytes |
|----------------------------------------------|
count: number of entries in this record
size: doesn't seem to be used for anything? equal to count * 4

ALRD Entry
|----------------------------------------------------------------------------|
|  offset |  type  | padding | EN name len | JP name len | EN name | JP name |
| 2 bytes | 1 byte |  1 byte |   1 byte    |   1 byte    | n bytes | n bytes |
|----------------------------------------------------------------------------|
offset: 
type: int type (0x20 = string?)
padding: amount of 0-padding after entry (align, padding, align)
EN/JP name: 0-padded to 4-byte boundary

ALRD object format:
{
	offset: int16,
	type: uint8,
	entries: array of ALRDEntry
}

**/

aigislib.ALRD = (function() {
	
	class ALRDEntry {
		
		constructor() {
			this.offset  = 0;
			this.type    = 0;
			this.padding = 0;
			this.name_en = "";
			this.name_jp = "";
			this.is_utf8 = true;
		}
		
		clone() {
			let entry = new ALRDEntry();
			
			entry.offset  = this.offset;
			entry.type    = this.type;
			entry.padding = this.padding;
			entry.name_en = this.name_en;
			entry.name_jp = this.name_jp;
			entry.is_utf8 = this.is_utf8;
			
			return entry;
		}
	}
	
	
	class ALRD extends aigislib.ALObject {
		
		constructor() {
			super();
			this.count   = 0;
			this.size    = 0;
			this.entries = [];
		}
		
		clone() {
			let alrd = new aigislib.ALRD();
			
			alrd.count = this.count;
			alrd.size = this.size;
			
			for(let i = 0; i < this.entries.length; i++) {
				alrd.entries.push(this.entries[i].clone());
			}
			
			return alrd;
		}
		
		patch(context) {
		}
		
		static parse(stream) {
			let alrd = new aigislib.ALRD();
			stream.seek(+6);
			alrd.count = stream.readUint8();
			stream.seek(+1);
			alrd.size = stream.readUint16();
			
			for(let _ = 0; _ < alrd.count; _++) {
				let entry = new ALRDEntry();
				entry.offset = stream.readUint16();
				entry.type = stream.readUint8();
				
				entry.padding = stream.readUint8();
				let len_en = stream.readUint8();
				let len_jp = stream.readUint8();
				
				entry.name_en = stream.readNullTerminatedString(len_en);
				entry.name_jp = stream.readNullTerminatedString(len_jp);
				
				stream.align(4);
				stream.seek(+entry.padding);
				stream.align(4);
				
				alrd.entries.push(entry);
			}
			
			return alrd;
		}
		
		write_to_stream(stream) {
			// write ALRD header
			stream.writeString("ALRD");
			stream.writeUint16(1); // version?
			stream.writeUint8 (this.entries.length);
			stream.writeUint8 (0); // ??
			stream.writeUint16(this.entries.length * 4);
			
			// write entries
			for(let entry of this.entries) {
				stream.writeUint16(entry.offset, true);
				stream.writeUint8 (entry.type);
				stream.writeUint8 (entry.padding);
				stream.writeUint8 (entry.name_en.length);
				stream.writeUint8 (entry.name_jp.length);
				
				stream.writeString(entry.name_en);
				stream.writeUint8 (0);
				stream.writeString(entry.name_jp);
				stream.writeUint8 (0);
				stream.align(4);
				
				for(let _ = 0; _ < entry.padding; _++) {
					stream.writeUint8(0);
				}
				
				stream.align(4);
			}
		}
		
	}
	
	return ALRD;
})();


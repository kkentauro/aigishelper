/**
altx.js

parse AigisLib texture files
**/


aigislib.ALTX = class extends aigislib.ALObject {
	
	constructor() {
		super();
	}
	
	static parse(stream) {
		const altx = new aigislib.ALTX();
		stream.seek(+4); // "ALTX"

		const version = stream.readUint8();
		const form = stream.readUint8();
		const count = stream.readUint16();
		const alig_offset = stream.start_offset + stream.readUint32();
		
		assert(version == 0, "only ALTX version 0 supported");
		assert(form == 0 || form == 0x0e, "wrong ALTX form");
		
		stream.jumpTo(alig_offset);
		
		if(form == 0) {
			const rawimage = aigislib.parse_object(stream);
			assert(rawimage.type == "ALIG");
			altx.rawimage = rawimage;
		} else if(form == 0x0e) {
			const width = stream.readUint16();
			const height = stream.readUint16();
			const name = stream.readNullTerminatedString();
			
			altx.rawimage = name
			altx.width = width
			altx.height = height
		}
		
		return altx;
	}
	
	write_to_stream(stream) {
	}
	
	async patch() {
	}
}	




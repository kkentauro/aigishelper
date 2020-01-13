/**
stream.js

classes for reading and writing byte and bit streams
**/

// TODO: hide these classes?
aigislib.BinaryStreamWriter = class {
	
	constructor() {
		this.data = [];
		this.position = 0;
		this.start_offset = 0;
	}
	
	
	jumpTo(position) {
		this.position = position;
	}
	
	seek(offset) {
		this.position += offset;
	}
	
	align(blocksize) {
		while(this.position % blocksize != 0) {
			this.writeUint8(0);
		}
	}
	
	
	writeALObject(obj) {
		let old_start = this.start_offset;
		this.start_offset = this.position;
		
		obj.write_to_stream(this);
		
		this.start_offset = old_start;
	}
	
	
	writeBlock(view) {
		let written = this.writeBlockAtPosition(this.position, view);
		this.seek(+written);
	}
	
	writeBlockAtPosition(position, view) {
		for(let i = 0; i < view.byteLength; i++) {
			this.writeUint8AtPosition(position + i, view.getUint8(i));
		}
		
		return view.byteLength;
	}
	
	pad(num) {
		for(let _ = 0; _ < num; _++) {
			this.writeUint8(0);
		}
	}
	
	writeString(str) {
		this.writeStringAtPosition(this.position, str);
		this.seek(+str.length);
	}
	
	writeStringAtPosition(position, str) {
		let view = new DataView(new ArrayBuffer(str.length));
		
		for(let i = 0; i < view.byteLength; i++) {
			view.setUint8(i, str.charCodeAt(i));
		}
		
		this.writeBlockAtPosition(position, view);
	}
	
	writeUint8(val) {
		this.writeUint8AtPosition(this.position, val);
		this.seek(+1);
	}
	
	writeInt8(val) {
		this.writeInt8AtPosition(this.position, val);
		this.seek(+1);
	}
	
	writeUint16(val) {
		let view = new DataView(new ArrayBuffer(2));
		view.setUint16(0, val, true);
		this.writeBlock(view);
	}
	
	writeInt16(val) {
		let view = new DataView(new ArrayBuffer(2));
		view.setInt16(0, val, true);
		this.writeBlock(view);
	}
	
	writeUint32(val) {
		let view = new DataView(new ArrayBuffer(4));
		view.setUint32(0, val, true);
		this.writeBlock(view);
	}
	
	writeInt32(val) {
		let view = new DataView(new ArrayBuffer(4));
		view.setInt32(0, val, true);
		this.writeBlock(view);
	}
	
	writeBigUint64(val) {
		let view = new DataView(new ArrayBuffer(8));
		view.setBigUint64(0, val, true);
		this.writeBlock(view);
	}
	
	writeBigInt64(val) {
		let view = new DataView(new ArrayBuffer(8));
		view.setBigInt64(0, val, true);
		this.writeBlock(view);
	}
	
	writeFloat32(val) {
		let view = new DataView(new ArrayBuffer(4));
		view.setFloat32(0, val, true);
		this.writeBlock(view);
	}
	
	writeFloat64(val) {
		let view = new DataView(new ArrayBuffer(8));
		view.setFloat64(0, val, true);
		this.writeBlock(view);
	}
	
	
	writeUint8AtPosition(position, val) {
		this.data[position] = val;
	}
	
	writeInt8AtPosition(position, val) {
		this.data[position] = val;
	}
	
	writeUint16AtPosition(position, val) {
		let view = new DataView(new ArrayBuffer(2));
		view.setUint16(0, val, true);
		this.writeBlockAtPosition(position, view);
	}
	
	writeInt16AtPosition(position, val) {
		let view = new DataView(new ArrayBuffer(2));
		view.setInt16(0, val, true);
		this.writeBlockAtPosition(position, view);
	}
	
	writeUint32AtPosition(position, val) {
		let view = new DataView(new ArrayBuffer(4));
		view.setUint32(0, val, true);
		this.writeBlockAtPosition(position, view);
	}
	
	writeInt32AtPosition(position, val) {
		let view = new DataView(new ArrayBuffer(4));
		view.setInt32(0, val, true);
		this.writeBlockAtPosition(position, view);
	}
	
	writeBigUint64AtPosition(position, val) {
		let view = new DataView(new ArrayBuffer(8));
		view.setBigUint64(0, val, true);
		this.writeBlockAtPosition(position, view);
	}
	
	writeBigInt64AtPosition(position, val) {
		let view = new DataView(new ArrayBuffer(8));
		view.setBigInt64(0, val, true);
		this.writeBlockAtPosition(position, view);
	}
	
	writeFloat32AtPosition(position, val) {
		let view = new DataView(new ArrayBuffer(4));
		view.setFloat32(0, val, true);
		this.writeBlockAtPosition(position, view);
	}
	
	writeFloat64AtPosition(position, val) {
		let view = new DataView(new ArrayBuffer(8));
		view.setFloat64(0, val, true);
		this.writeBlockAtPosition(position, view);
	}
	
	asDataView() {
		let view = new DataView(new ArrayBuffer(this.data.length));
		
		for(let i = 0; i < this.data.length; i++) {
			assert(i in this.data, "sparse array not completely filled");
			view.setUint8(i, this.data[i]);
		}
		
		return view;
	}
	
}

aigislib.BinaryStreamReader = class {
	
	constructor(data) {
		if(!(data instanceof DataView)) {
			throw new Error("data must be DataView");
		}
		
		this.data = data;
		this.position = 0;
		this.start_offset = 0;
	}
	
	parseALObject() {
		const old_start = this.position;
		const object_type = this.readStringFromPosition(this.position, 4);
		let object;
		this.start_offset = this.position;
		
		switch(object_type) {
			case "ALAR": object = aigislib.ALAR.parse(this); break;
			case "ALFT": object = aigislib.ALFT.parse(this); break;
			case "ALIG": object = aigislib.ALIG.parse(this); break;
			case "ALLZ": object = aigislib.ALLZ.parse(this); break;
			case "ALMT": object = aigislib.ALMT.parse(this); break;
			case "ALOD": object = aigislib.ALOD.parse(this); break;
			case "ALRD": object = aigislib.ALRD.parse(this); break;
			case "ALSN": object = aigislib.ALSN.parse(this); break;
			case "ALTB": object = aigislib.ALTB.parse(this); break;
			case "ALTX": object = aigislib.ALTX.parse(this); break;
			default: throw new Error("unknown object type: " + object_type + " at " + this.position);
		}
		
		this.start_offset = old_start;
		return object;
	}
	
	get length() {
		return this.data.buffer.byteLength;
	}
	
	/**
	 * Sets the current position of the stream to {offset}.
	**/
	jumpTo(offset) {
		this.position = offset;
	}
	
	/**
	 * Moves the current position of the stream forward or backward.
	 * Positive {offset} seeks forward, negative {offset} seeks backward.
	**/
	seek(offset) {
		this.position += offset;
	}
	
	/**
	 * Aligns the stream to a multiple of {blocksize}
	 * by advancing its position.
	**/
	align(blocksize) {
		if((this.position % blocksize) != 0) {
			this.seek(blocksize - (this.position % blocksize));
		}
	}
	
	readBlock(length) {
		const block = this.readBlockFromPosition(this.position, length);
		
		this.seek(+length);
		return block;
	}
	
	readBlockFromPosition(position, length) {
		const block = this.data.buffer.slice(position, position + length);
		
		assert(block.byteLength == length, "stream truncated reading block");
		return block;
	}
	
	/**
	 * Reads {length} characters and returns them.
	 * Advances the stream by {length}.
	**/
	readString(length) {
		const str = this.readStringFromPosition(this.position, length);
		
		this.seek(+length);
		return str;
	}
	
	/**
	 * Reads {length} characters and returns them.
	 * Does not advance the stream.
	**/
	readStringFromPosition(position, length) {
		const block = this.readBlockFromPosition(position, length);
		const bytes = new Uint8Array(block);
		
		return bytes.reduce((accum, val) =>
			accum + String.fromCharCode(val), "");
	}
	
	/**
	 * Reads up to {maxlength} characters and returns them.
	 * If a 0 byte is found, stops reading without including the 0 byte.
	 * Advances the stream past the 0 byte if one was found.
	 * Otherwise advances the stream by {maxlength}.
	 * If {maxlength} is omitted, reads until a 0 byte is found.
	**/
	readNullTerminatedString(maxlength) {
		const str = this.readNullTerminatedStringFromPosition(this.position,
			maxlength);
		
		this.seek(+str.length + 1);
		return str;
	}
	
	/**
	 * Reads up to {maxlength} characters and returns them.
	 * If a 0 byte is found, stops reading without including the 0 byte.
	 * Does not advance the stream.
	 * If {maxlength} is omitted, reads until a 0 byte is found.
	**/
	readNullTerminatedStringFromPosition(position, maxlength) {
		let length = 0;
		const limit = (!!maxlength)
			? Math.min(this.length, position + maxlength)
			: this.length;

		while((position + length < limit)
			&& (this.readUint8FromPosition(position + length) != 0))
		{
			length++;
		}
		
		return this.readStringFromPosition(position, length);
	}
	
	readUint8() {
		const val = this.readUint8FromPosition(this.position);
		
		this.seek(+1);
		return val;
	}
	
	readInt8() {
		const val = this.readInt8FromPosition(this.position);
		
		this.seek(+1);
		return val;
	}
	
	readUint16() {
		const val = this.readUint16FromPosition(this.position, true);
		
		this.seek(+2);
		return val;
	}
	
	readInt16() {
		const val = this.readInt16FromPosition(this.position, true);
		
		this.seek(+2);
		return val;
	}
	
	readUint32() {
		const val = this.readUint32FromPosition(this.position, true);
		
		this.seek(+4);
		return val;
	}
	
	readInt32() {
		const val = this.readInt32FromPosition(this.position, true);
		
		this.seek(+4);
		return val;
	}
	
	readBigUint64() {
		const val = this.readBigUint64FromPosition(this.position, true);
		
		this.seek(+8);
		return val;
	}
	
	readBigInt64() {
		const val = this.readBigInt64FromPosition(this.position, true);
		
		this.seek(+8);
		return val;
	}
	
	readFloat32() {
		const val = this.readFloat32FromPosition(this.position, true);
		
		this.seek(+4);
		return val;
	}
	
	readFloat64() {
		const val = this.readFloat64FromPosition(this.position, true);
		
		this.seek(+8);
		return val;
	}
	
	readUint8FromPosition(position) {
		return this.data.getUint8(position);
	}
	
	readInt8FromPosition(position) {
		return this.data.getInt8(position);
	}
	
	readUint16FromPosition(position, littleEndian) {
		return this.data.getUint16(position, littleEndian || true);
	}
	
	readInt16FromPosition(position, littleEndian) {
		return this.data.getInt16(position, littleEndian || true);
	}
	
	readUint32FromPosition(position, littleEndian) {
		return this.data.getUint32(position, littleEndian || true);
	}
	
	readInt32FromPosition(position, littleEndian) {
		return this.data.getInt32(position, littleEndian || true);
	}
	
	readBigUint64FromPosition(position, littleEndian) {
		return this.data.getBigUint64(position, littleEndian || true);
	}
	
	readBigInt64FromPosition(position, littleEndian) {
		return this.data.getBigInt64(position, littleEndian || true);
	}
	
	readFloat32FromPosition(position, littleEndian) {
		return this.data.getFloat32(position, littleEndian || true);
	}
	
	readFloat64FromPosition(position, littleEndian) {
		return this.data.getFloat64(position, littleEndian || true);
	}
	
}

aigislib.BitStream = class {
	
	constructor(binary_stream) {
		this.stream = binary_stream;
		this.buffer = 0;
		this.remaining_bits = 0;
		
		this.version = this.stream.readUint8();
		assert(this.version == 1);
		
		this.minbits_length	 = this.stream.readUint8();
		this.minbits_offset	 = this.stream.readUint8();
		this.minbits_literal = this.stream.readUint8();
		this.dst_size        = this.stream.readUint32();
	}
	
	get bufferstr() {
		return this.buffer.toString(2);
	}
	
	readBits(numbits) {
		let bytes_needed = Math.ceil((numbits - this.remaining_bits) / 8);
		bytes_needed = Math.max(bytes_needed, 0);
		
		for(let i = 0; i < bytes_needed; i++) {
			let byte = this.stream.readUint8();
			this.buffer |= byte << (this.remaining_bits + (i * 8));
		}
		this.remaining_bits += (8 * bytes_needed);
		
		// bits = buffer & 0b111111... (numbits 1s)
		let bits = (~(~0 << numbits)) & this.buffer;
		
		this.buffer >>= numbits;
		this.remaining_bits -= numbits;
		
		return bits;
	}

	readUnary() {
		let n = 0;
		
		while(this.readBits(1) == 1) {
			n++;
		}
		
		return n;
	}

	readControl(minbits) {
		let u = this.readUnary();
		let n = this.readBits(u + minbits);
		
		if(u > 0) {
			return n + (((1 << u) - 1) << minbits);
		} else {
			return n;
		}
	}

	readControlLength() {
		return 3 + this.readControl(this.minbits_length);
	}

	readControlOffset() {
		return -1 - this.readControl(this.minbits_offset);
	}

	readControlLiteral() {
		return 1 + this.readControl(this.minbits_literal);
	}
}


/**
allz.js

parse AigisLib LZ files

ALLZ Header
|-----------------------------------------------------------------|
| "ALLZ" | version | length | offset | literal | data stream size |
| 4 bytes|  1 byte | 1 byte | 1 byte |  1 byte |     4 bytes      |
|-----------------------------------------------------------------|
version: 1
minbits length:  number of bits added to all length-type control sequences
minbits offset:  number of bits added to all offset-type control sequences
minbits literal: number of bits added to all literal-type control sequences
data stream size: size of uncompressed data stream

ALLZ initial segment
|-------------------------------------------------------|
| control |     literal     | word length | word offset |
|  n bits | <control> bytes |    n bits   |    n bits   |
|-------------------------------------------------------|

ALLZ segment
|-------|
|  mode |
| 1 bit |
|-------|
        |-----------------------------------------------------------------|
  mode  | literal size | word length | word offset |       literal        |
  = 0   |    n bits    |    n bits   |    n bits   | <literal size> bytes |
        |-----------------------------------------------------------------|
        |---------------------------|
  mode  | word offset | word length |
  = 1   |    n bits   |    n bits   |
        |---------------------------|

bit-sized subsections:
|---------------------------|-----------------------|
|   number of bits (unary)  |         value         |
| <number of bits + 1> bits | <number of bits> bits |
|---------------------------|-----------------------|
**/


aigislib.ALLZ = class extends aigislib.ALObject {
	
	constructor() {
		super();
	}
	
	static parse(stream) {
		let dst = [];
		
		stream.seek(+4);
		let bits = new aigislib.BitStream(stream);
		
		function copy_word(word_off, word_len) {
			assert(word_len >= 0);
			
			for(let i = 0; i < word_len; i++) {
				let val = dst[(word_off + dst.length) % dst.length];
				dst.push(val);
			}
		}
		
		function copy_literal(control) {
			let block = stream.readBlock(control);
			let bytes = Array.from(new Uint8Array(block));
			dst.push(...bytes);
		}
		
		// initial segment
		let control_literal = bits.readControlLiteral();
		copy_literal(control_literal);
		
		let word_off = bits.readControlOffset();
		let word_len = bits.readControlLength();
		let literal = 0;
		let finish = "overflow";
		
		while(stream.position <= stream.length) {
			if(dst.length + word_len >= bits.dst_size) {
				finish = "word";
				break;
			}
			
			if(bits.readBits(1) == 0) {
				literal = bits.readControlLiteral();
				if(dst.length + word_len + literal >= bits.dst_size) {
					finish = "literal";
					break;
				}
				
				let literal_offset = stream.position;
				stream.seek(+literal);
				
				let next_off = bits.readControlOffset();
				let next_len = bits.readControlLength();
				copy_word(word_off, word_len);
				
				let control_offset = stream.position;
				stream.jumpTo(literal_offset);
				
				copy_literal(literal);
				assert(stream.position == literal_offset + literal);
				stream.jumpTo(control_offset);
				
				word_off = next_off;
				word_len = next_len;
			} else {
				let next_off = bits.readControlOffset();
				let next_len = bits.readControlLength();
				
				copy_word(word_off, word_len);
				word_off = next_off;
				word_len = next_len;
			}
		}
		
		if(finish == "word") {
			copy_word(word_off, word_len);
		} else if(finish == "literal") {
			copy_word(word_off, word_len);
			copy_literal(literal);
		} else if(finish == "overflow") {
			throw new Error("data overflowed");
		}
		
		assert(dst.length == bits.dst_size);
		assert(bits.buffer == 0);
		
		const uncompressed = new Uint8Array(dst);
		const view = new DataView(uncompressed.buffer)
		const lz_stream = new aigislib.BinaryStreamReader(view);
		return aigislib.parse_object(lz_stream);
	}
	
	write_to_stream(stream) {
	}
	
	patch() {
		throw "should not be trying to patch this (ALLZ)";
	}
	
}


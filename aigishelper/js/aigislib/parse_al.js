/**
parse_al.js

parse AigisLib files
AL parsing functions adapted for javascript from code by lzlis

AL files are little-endian
**/

aigislib = {};
aigislib.ALObject = class {};

aigislib.parse_object = function(stream) {
	assert(stream instanceof aigislib.BinaryStreamReader,
		"argument to aigislib.parse_object must be BinaryStreamReader");
	return stream.parseALObject();
};

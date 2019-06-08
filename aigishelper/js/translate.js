/**
translate.js

translate JP strings
**/


aigishelper.make_patch_context = async function(patch_zip, filename) {
	let context = {
		filename: filename,
		translate_string: str => str,
	};
	
	// make inheritable context for folders
	if(filename + "/" in patch_zip.files) {
		context.root = patch_zip.folder(filename);
		return context;
	}
	
	if(!(filename in patch_zip.files)) {
		return context;
	}
	
	// load b64 encoded text and decode
	let patch_file = patch_zip.file(filename);
	let text = await patch_file.async("text")
		.then(b64str => atob(b64str));
	
	// split translation file into lines delimited
	// line format: jp\0en\0\0\n
	let regex = /(?<jp>[^\0]+)\0(?<en>[^\0]*)\0\0(?:\n|$)/g;
	let matches = text.matchAll(regex);
	let pairs = {};
	let match = matches.next();
	
	// split lines into jp/en pairs
	while(!match.done) {
		let jp = aigishelper.ascii_to_utf8(match.value.groups["jp"]);
		let en = aigishelper.ascii_to_utf8(match.value.groups["en"]);
		pairs[jp] = pairs[jp] || en;
		match = matches.next();
	}
	
	
	context.translate_string = function(str) {
		assert(typeof(str) === "string", "can only patch strings");
		return pairs[str] || str || "";
	}
	
	return context;
};

aigishelper.ascii_to_utf8 = function(str) {
	return decodeURIComponent(escape(str));
};

aigishelper.utf8_to_ascii = function(str) {
	return unescape(encodeURIComponent(str));
};


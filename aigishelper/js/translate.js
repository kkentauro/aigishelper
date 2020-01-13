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
	if(patch_zip.folder(new RegExp(filename + "/$")).length > 0) {
		context.root = patch_zip.folder(filename);
		return context;
	}
	
	if(!patch_zip.file(filename)) {
		return context;
	}
	
	// load json-encoded text and decode
	let patch_file = patch_zip.file(filename);
	let jsonobj = await patch_file.async("text")
		.then(jsonstr => JSON.parse(jsonstr));
		
	context.translate_string = function(str) {
		assert(typeof(str) === "string", "can only patch strings");
		return jsonobj.pairs[str] || str || "";
	}
	
	return context;
};

aigishelper.ascii_to_utf8 = function(str) {
	return decodeURIComponent(escape(str));
};

aigishelper.utf8_to_ascii = function(str) {
	return unescape(encodeURIComponent(str));
};


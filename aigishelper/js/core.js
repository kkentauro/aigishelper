/**
core.js

main processing of downloaded files
**/


const assert = function(expr, message, ...args) {
	if(!expr) {
		aigishelper.warn((message || "Assertion failed"), ...args);
		throw message || "Assertion failed";
	}
};

aigishelper.warn = function(message, ...args) {
	console.log(message, ...args);
	console.trace();
}

aigishelper.process_response = (function() {
	
	const process_file_list = function(buffer) {
		let typedbuffer = new Uint8Array(buffer)
		
		// decode buffer as string
		let reducefunc = function(accumulator, value) {
			let decoded_value = value ^ (0xea ^ 0x30);
			return accumulator + String.fromCharCode(decoded_value);
		}
		
		let filelist = typedbuffer.reduce(reducefunc);
		let lines = filelist.split("\n");
		let entries = lines.map((value) => value.split(","));
		
		for(let entry of entries) {
			if(entry.length != 5) {
				continue;
			}
			
			let filemap = aigishelper.filemap;
			let [part1, part2, unk1, unk2, filename] = entry;
			
			let details = {
				filename: filename,
				0: unk1,
				1: unk2,
			};
			
			filemap[part1] = filemap[part1] || {};
			filemap[part1][part2] = filemap[part1][part2] || [];
			filemap[part1][part2].push(details);
		}
		
	}

	const url_part_regex = /^http(s?):\/\/assets.millennium-war.net\/(?<part1>(?:[a-f0-9])+)\/(?<part2>(?:[a-f0-9])+)/;
	const process_data_file = async function(url, response) {
		let patch_files = aigishelper.patch_zip.files;
		let match = url.match(url_part_regex);
		
		if(!match) {
			return response;
		}
		
		// look up filename
		let part1 = match.groups.part1;
		let part2 = match.groups.part2;
		let filename;
		
		try {
			// TODO: check all file aliases?
			filename = aigishelper.filemap[part1][part2][0].filename;
			aigishelper.files[filename] = response;
		} catch(e) {
			return response;
		}
		
		// only patch files we have a patch for
		if(!(filename in patch_files) && !((filename + "/") in patch_files)) {
			return response;
		}
		
		try {
			const view = new DataView(response);
			const input_stream = new aigislib.BinaryStreamReader(view);
			const al_object = aigislib.parse_object(input_stream);
			const output_stream = new aigislib.BinaryStreamWriter();
			const context = await aigishelper.make_patch_context(aigishelper.patch_zip, filename);
			const patched_object = al_object.patch(context, filename);
			
			aigishelper.patched_files[filename] = patched_object;
			output_stream.writeALObject(patched_object);
			
			return output_stream.asDataView();
		} catch(e) {
			aigishelper.warn("failed to patch", filename, response, e);
		}
		
		return response;
	}
	
	const process_xml_file = function(source_url, object_url, response) {
		try {
			let decoded = aigishelper.decode(new DataView(response));
			let decompressed = aigishelper.decompress(decoded);
			let parsed = $.parseXML(decompressed);

			URL.revokeObjectURL(object_url);
			return parsed;
		} catch(e) {
			aigishelper.warn("error processing xml file", source_url, object_url, response);
		}
		
	}

	const file_list_regex = /1fp32igvpoxnb521p9dqypak5cal0xv0/;
	const data_file_regex = /^http(s?):\/\/assets.millennium-war.net/;
	const xml_file_regex = /^http(s?):\/\/millennium-war.net/;
	const process_response = async function(source_url, object_url, response) {
		let new_response = response;
		
		if(source_url.match(file_list_regex)) {
			process_file_list(response);
		} else if(aigishelper.filemap && source_url.match(data_file_regex)) {
			new_response = await process_data_file(source_url, response);
		} else if(source_url.match(xml_file_regex)) {
			let xml = process_xml_file(source_url, object_url, response);
			aigishelper.xml_data[source_url] = xml;
		}
		
		return new_response;
	}
	
	return process_response;
	
})();


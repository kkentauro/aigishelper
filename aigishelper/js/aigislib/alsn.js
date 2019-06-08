/**
alsn.js

parse AigisLib sound?? files
**/


aigislib.ALSN = class extends aigislib.ALObject {
	
	constructor() {
		super();
	}
	
	static parse(stream) {
		throw new Error("ALSN parsing not implemented");
	}
	
	write_to_stream(stream) {
	}
	
	patch() {
	}
}	


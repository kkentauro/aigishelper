/**
background.js

background events for chrome extension
**/

const aigishelper = {};

// ============================================================================

aigishelper.reset = async function() {
	// TODO: revoke object urls and clean up other stuff
	aigishelper.filemap = {};
	aigishelper.files = {};
	aigishelper.xml_data = {};
	aigishelper.patched_files = {};
	
	aigishelper.scraped_strings = {};

	let promise = new Promise((resolve, reject) =>
		chrome.storage.local.get("patch_source_url", obj =>
			resolve(obj["patch_source_url"])));
	
	let patch_source_url = await promise;
	
	return await fetch(patch_source_url, {method: "GET", mode: "cors"})
		.then(response => response.blob())
		.then(file => JSZip.loadAsync(file))
		.then(zip => aigishelper.patch_zip = zip);
	
};

// ============================================================================

(function() {
	function parse_data(msg) {
		let xhr = new XMLHttpRequest();
		let source_url = msg.source_url;
		let object_url = msg.object_url;
		
		if(!source_url.match(/^http(s?):\/\/(assets.)?millennium-war.net/)) {
			return;
		}
		
		xhr.open("GET", object_url, true);
		xhr.responseType = "arraybuffer";
		xhr.onload = async function(e) {
			if(this.status != 200) {
				throw "GET status not 200";
			}
			
			let processed = await aigishelper.process_response(source_url,
				object_url, this.response);
			let processed_url;
			
			// TODO: /000/_GameInfoText is plain text and returns undefined,
			// remove from url patterns
			if(processed == undefined) processed = this.response;
			
			try {
				processed_url = URL.createObjectURL(new Blob([processed]));
			} catch(e) {
				console.log(e);
				return;
			}
			
			let response = {
				source_url: source_url,
				object_url: processed_url
			};
			
			let query = {
				url:["*://*.dmm.com/*","*://*.dmm.co.jp/*"]
			};
			
			// TODO: save tab id when initializing
			let callback = function(tabs) {
				assert(tabs.length > 0);
				chrome.tabs.sendMessage(tabs[0].id, response);
			};
			
			chrome.tabs.query(query, callback);
		};
		
		xhr.send();
	}

	function accept_message(msg, port) {
		switch(msg.action) {
			case "init":
				aigishelper.reset();
				break;
			case "data":
				parse_data(msg.detail);
				break;
			default:
				throw "unknown action " + msg.action;
		}
	}
	
	function connect(port) {
		if(port.name != "aigishelper") {
			return;
		}
		
		port.onMessage.addListener(accept_message);
	}

	function setup() {
		chrome.storage.local.get("patch_source_url", function(obj) {
			if("patch_source_url" in obj) {
				chrome.storage.local.set({"patch_source_url": "https://raw.githubusercontent.com/kkentauro/aigishelper-strings/master/strings.zip"});
				aigishelper.reset();
			}
		});
	}

	chrome.runtime.onConnect.addListener(connect);
	chrome.runtime.onInstalled.addListener(setup);

})();


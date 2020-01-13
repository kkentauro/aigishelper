/**
httpcapture.js

injected into page to capture data from aigis server
**/



$(document).ready(function() {
	let func_string = `
	(function() {
		let XHR = XMLHttpRequest.prototype;
		let _send = XHR.send;
		let _open = XHR.open;
		
		let [wait_for_parse, finish_parse] = (function() {
			let promises = {};
			
			let _wait_for_parse = async function(url) {
				function defer() {
					let _resolve, _reject;

					let promise = new Promise((resolve, reject) => {
						_resolve = resolve;
						_reject  = reject;
					});
					
					promise.resolve = _resolve;
					promise.reject  = _reject;

					return promise;
				}
				
				const promise = defer();
				promises[url] = promise;
				
				let x = await promise;
				return x;
			};
			
			let _finish_parse = function(source_url, response) {
				promises[source_url].resolve(response);
			};
			
			return [_wait_for_parse, _finish_parse];
		})();
		
		XHR.open = function(method, url) {
			this.url = url;
			return _open.apply(this, arguments);
		};
		
		XHR.send = function() {
			let _onreadystatechange = this.onreadystatechange;
			
			this.onreadystatechange = async (e) => {
				if(this.readyState < 4) {
					return;
				}
				
				let object_url = URL.createObjectURL(new Blob([this.response]));
				
				let event = new CustomEvent("aigishelper.http.response", {
					bubbles: true,
					detail: {
						source_url: this.url,
						object_url: object_url
					}
				});
				
				document.dispatchEvent(event);
				Object.defineProperty(this, 'response', { writable: true })
				this.response = await wait_for_parse(this.url);
				_onreadystatechange.apply(this, arguments);
			}
			
			return _send.apply(this, arguments);
		};
		
		document.addEventListener("aigishelper.http.response.parsed", function(event) {
			let data = event.detail;
			let source_url = data.source_url;
			let response = data.response;
			finish_parse(source_url, response);
		});
		
	})();`;
	
	$("<script>")
		.attr("type", "text/javascript")
		.html(func_string)
		.prependTo($("head"));
	
});

chrome.extension.onMessage.addListener(function(msg) {
	let source_url = msg.source_url;
	let object_url = msg.object_url;
	
	let xhr = new XMLHttpRequest();
	xhr.open("GET", object_url, true);
	xhr.responseType = "arraybuffer";
	
	xhr.onload = function(e) {
		if (this.status == 200) {
			let event = new CustomEvent("aigishelper.http.response.parsed", {
				bubbles: false,
				detail: {
					source_url: source_url,
					response: this.response
				}
			});
			
			document.dispatchEvent(event);
		}
		
		URL.revokeObjectURL(object_url);
	};
	
	xhr.send();
});

document.addEventListener("aigishelper.http.response", function(event) {
	let data = {action: "data", detail: event.detail};
	
	let id = "pacehklippniaioogokohlpgjkfpfjfp";
	let port = chrome.runtime.connect(id, {name: "aigishelper"});
	
	port.postMessage(data);
});

(function() {
	let data = {action: "init"};
	let id = "pacehklippniaioogokohlpgjkfpfjfp";
	let port = chrome.runtime.connect(id, {name: "aigishelper"});
	
	port.postMessage(data);
})();

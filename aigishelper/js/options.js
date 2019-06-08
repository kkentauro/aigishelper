/**
options.js

options page logic
**/

function save() {
	chrome.storage.local.set({"patch_source_url": $("#source").val()});
}

function changed(changes, area_name) {
	if("patch_source_url" in changes) {
		$("#source").val(changes["patch_source_url"].newValue);
	}
}

chrome.storage.local.onChanged.addListener(changed);
chrome.storage.local.get("patch_source_url", obj =>
	$("#source").attr("value", obj["patch_source_url"]));

$("#save_source").on("click", save);

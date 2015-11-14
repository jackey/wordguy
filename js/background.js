function danciGuyMenuItemClick(info, tab) {
	console.log('send message to content script: ');
	chrome.tabs.sendMessage(tab.id, {
		from: 'dancijun_menu_click',
		info: info,
		tab: tab
	});
}

var gPos = null;
var from = 'auto';
var to = 'en';
var clientId = 'v6hGcVXMm1yrAz3MOoMspZzO';
var apiAddr = 'http://openapi.baidu.com/public/2.0/bmt/translate';

var idControl = chrome.contextMenus.create({
	"title": "单词君",
	"contexts": ["selection"],
	"onclick": function (info, tab) {
		return danciGuyMenuItemClick(info, tab);
		// var q = e.selectionText;
		// var param = ajax.buildQuery({
		// 	from: from,
		// 	to: to,
		// 	client_id: clientId,
		// 	q: q
		// });
		// var url = apiAddr + "?" + param;
		// ajax.get(url, function (res){
		// 	console.log(arguments);
		// });
	}
});
(function(global,factory){if(typeof exports==="object"&&exports){factory(exports)}else if(typeof define==="function"&&define.amd){define(["exports"],factory)}else{factory(global.Mustache={})}})(this,function(mustache){var Object_toString=Object.prototype.toString;var isArray=Array.isArray||function(object){return Object_toString.call(object)==="[object Array]"};function isFunction(object){return typeof object==="function"}function escapeRegExp(string){return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&")}var RegExp_test=RegExp.prototype.test;function testRegExp(re,string){return RegExp_test.call(re,string)}var nonSpaceRe=/\S/;function isWhitespace(string){return!testRegExp(nonSpaceRe,string)}var entityMap={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;"};function escapeHtml(string){return String(string).replace(/[&<>"'\/]/g,function(s){return entityMap[s]})}var whiteRe=/\s*/;var spaceRe=/\s+/;var equalsRe=/\s*=/;var curlyRe=/\s*\}/;var tagRe=/#|\^|\/|>|\{|&|=|!/;function parseTemplate(template,tags){if(!template)return[];var sections=[];var tokens=[];var spaces=[];var hasTag=false;var nonSpace=false;function stripSpace(){if(hasTag&&!nonSpace){while(spaces.length)delete tokens[spaces.pop()]}else{spaces=[]}hasTag=false;nonSpace=false}var openingTagRe,closingTagRe,closingCurlyRe;function compileTags(tags){if(typeof tags==="string")tags=tags.split(spaceRe,2);if(!isArray(tags)||tags.length!==2)throw new Error("Invalid tags: "+tags);openingTagRe=new RegExp(escapeRegExp(tags[0])+"\\s*");closingTagRe=new RegExp("\\s*"+escapeRegExp(tags[1]));closingCurlyRe=new RegExp("\\s*"+escapeRegExp("}"+tags[1]))}compileTags(tags||mustache.tags);var scanner=new Scanner(template);var start,type,value,chr,token,openSection;while(!scanner.eos()){start=scanner.pos;value=scanner.scanUntil(openingTagRe);if(value){for(var i=0,valueLength=value.length;i<valueLength;++i){chr=value.charAt(i);if(isWhitespace(chr)){spaces.push(tokens.length)}else{nonSpace=true}tokens.push(["text",chr,start,start+1]);start+=1;if(chr==="\n")stripSpace()}}if(!scanner.scan(openingTagRe))break;hasTag=true;type=scanner.scan(tagRe)||"name";scanner.scan(whiteRe);if(type==="="){value=scanner.scanUntil(equalsRe);scanner.scan(equalsRe);scanner.scanUntil(closingTagRe)}else if(type==="{"){value=scanner.scanUntil(closingCurlyRe);scanner.scan(curlyRe);scanner.scanUntil(closingTagRe);type="&"}else{value=scanner.scanUntil(closingTagRe)}if(!scanner.scan(closingTagRe))throw new Error("Unclosed tag at "+scanner.pos);token=[type,value,start,scanner.pos];tokens.push(token);if(type==="#"||type==="^"){sections.push(token)}else if(type==="/"){openSection=sections.pop();if(!openSection)throw new Error('Unopened section "'+value+'" at '+start);if(openSection[1]!==value)throw new Error('Unclosed section "'+openSection[1]+'" at '+start)}else if(type==="name"||type==="{"||type==="&"){nonSpace=true}else if(type==="="){compileTags(value)}}openSection=sections.pop();if(openSection)throw new Error('Unclosed section "'+openSection[1]+'" at '+scanner.pos);return nestTokens(squashTokens(tokens))}function squashTokens(tokens){var squashedTokens=[];var token,lastToken;for(var i=0,numTokens=tokens.length;i<numTokens;++i){token=tokens[i];if(token){if(token[0]==="text"&&lastToken&&lastToken[0]==="text"){lastToken[1]+=token[1];lastToken[3]=token[3]}else{squashedTokens.push(token);lastToken=token}}}return squashedTokens}function nestTokens(tokens){var nestedTokens=[];var collector=nestedTokens;var sections=[];var token,section;for(var i=0,numTokens=tokens.length;i<numTokens;++i){token=tokens[i];switch(token[0]){case"#":case"^":collector.push(token);sections.push(token);collector=token[4]=[];break;case"/":section=sections.pop();section[5]=token[2];collector=sections.length>0?sections[sections.length-1][4]:nestedTokens;break;default:collector.push(token)}}return nestedTokens}function Scanner(string){this.string=string;this.tail=string;this.pos=0}Scanner.prototype.eos=function(){return this.tail===""};Scanner.prototype.scan=function(re){var match=this.tail.match(re);if(!match||match.index!==0)return"";var string=match[0];this.tail=this.tail.substring(string.length);this.pos+=string.length;return string};Scanner.prototype.scanUntil=function(re){var index=this.tail.search(re),match;switch(index){case-1:match=this.tail;this.tail="";break;case 0:match="";break;default:match=this.tail.substring(0,index);this.tail=this.tail.substring(index)}this.pos+=match.length;return match};function Context(view,parentContext){this.view=view==null?{}:view;this.cache={".":this.view};this.parent=parentContext}Context.prototype.push=function(view){return new Context(view,this)};Context.prototype.lookup=function(name){var cache=this.cache;var value;if(name in cache){value=cache[name]}else{var context=this,names,index;while(context){if(name.indexOf(".")>0){value=context.view;names=name.split(".");index=0;while(value!=null&&index<names.length)value=value[names[index++]]}else if(typeof context.view=="object"){value=context.view[name]}if(value!=null)break;context=context.parent}cache[name]=value}if(isFunction(value))value=value.call(this.view);return value};function Writer(){this.cache={}}Writer.prototype.clearCache=function(){this.cache={}};Writer.prototype.parse=function(template,tags){var cache=this.cache;var tokens=cache[template];if(tokens==null)tokens=cache[template]=parseTemplate(template,tags);return tokens};Writer.prototype.render=function(template,view,partials){var tokens=this.parse(template);var context=view instanceof Context?view:new Context(view);return this.renderTokens(tokens,context,partials,template)};Writer.prototype.renderTokens=function(tokens,context,partials,originalTemplate){var buffer="";var self=this;function subRender(template){return self.render(template,context,partials)}var token,value;for(var i=0,numTokens=tokens.length;i<numTokens;++i){token=tokens[i];switch(token[0]){case"#":value=context.lookup(token[1]);if(!value)continue;if(isArray(value)){for(var j=0,valueLength=value.length;j<valueLength;++j){buffer+=this.renderTokens(token[4],context.push(value[j]),partials,originalTemplate)}}else if(typeof value==="object"||typeof value==="string"){buffer+=this.renderTokens(token[4],context.push(value),partials,originalTemplate)}else if(isFunction(value)){if(typeof originalTemplate!=="string")throw new Error("Cannot use higher-order sections without the original template");value=value.call(context.view,originalTemplate.slice(token[3],token[5]),subRender);if(value!=null)buffer+=value}else{buffer+=this.renderTokens(token[4],context,partials,originalTemplate)}break;case"^":value=context.lookup(token[1]);if(!value||isArray(value)&&value.length===0)buffer+=this.renderTokens(token[4],context,partials,originalTemplate);break;case">":if(!partials)continue;value=isFunction(partials)?partials(token[1]):partials[token[1]];if(value!=null)buffer+=this.renderTokens(this.parse(value),context,partials,value);break;case"&":value=context.lookup(token[1]);if(value!=null)buffer+=value;break;case"name":value=context.lookup(token[1]);if(value!=null)buffer+=mustache.escape(value);break;case"text":buffer+=token[1];break}}return buffer};mustache.name="mustache.js";mustache.version="1.0.0";mustache.tags=["{{","}}"];var defaultWriter=new Writer;mustache.clearCache=function(){return defaultWriter.clearCache()};mustache.parse=function(template,tags){return defaultWriter.parse(template,tags)};mustache.render=function(template,view,partials){return defaultWriter.render(template,view,partials)};mustache.to_html=function(template,view,partials,send){var result=mustache.render(template,view,partials);if(isFunction(send)){send(result)}else{return result}};mustache.escape=escapeHtml;mustache.Scanner=Scanner;mustache.Context=Context;mustache.Writer=Writer});

(function ($) {
	var colors = [
		'color1', 
		'color2', 
		'color3', 
		'color4', 
		'color5',
		'color6',
		'color7',
		'color8',
		'color9',
		'color10',
		'color11',
		'color12',
	];

	var randColor = (function () {
		var preColor = null;
		return function () {
			var color = colors[Math.floor(Math.random() * 12)];

			while (color == preColor) {
				color = colors[Math.floor(Math.random() * 12)];
			}

			preColor = color;

			return color;
		}
	})();

	function isEmpty(item) {
		if (Object.prototype.toString.apply(item) == '[object Object]') {
			var l = 0;
			for (var k in item ){
				l += 1;
			}

			return l <= 0;
		}
		else if (Object.prototype.toString.apply(item) == '[object Array]') {
			return item.length <= 0;
		}

		return false;
	}

	function storageGet(cb) {
		cb || (cb = function () {});
		chrome.storage.sync.get('danci_jun_keys', function (keys) {
			keys = keys['danci_jun_keys'];
			if (isEmpty(keys['keys'])) {
				cb([]);
			}
			else {
				chrome.storage.sync.get(keys['keys'], function (items) {
					cb(items);
				});
			}
		});
	}

	function randomColor() {
		var wordsContainer = $('#dancijun-index .contain');
		$('.word-item', wordsContainer).each(function () {
			var colorCls = $(this).attr('class').match(/color[0-9]+/);
			if (colorCls != null &&  typeof colorCls[0] != 'undefined') {
				$(this).removeClass(colorCls[0]);
			}
			$(this).addClass(randColor());
		});
	}

	function showWords() {
		var wordsContainer = $('#dancijun-index .full-words');
		wordsContainer.siblings('.contain').addClass('hideme');
		wordsContainer.hide().removeClass('hideme').fadeIn('slow');
	}

	function showSceneWords() {
		var wordsContainer = $('#dancijun-index .scene-con');
		wordsContainer.siblings('.contain').addClass('hideme');
		wordsContainer.hide().removeClass('hideme').fadeIn('slow');
	}

	function showAboutMe() {
		var wordsContainer = $('#dancijun-index .about-me');
		wordsContainer.siblings('.contain').addClass('hideme');
		wordsContainer.hide().removeClass('hideme').fadeIn('slow');
	}

	$(document).ready(function () {
		var wordsContainer = $('#dancijun-index .full-words');
		var sceneWordsContainer = $("#dancijun-index .scene-con");

		showWords();

		var tpl = '<div class="word-item"><p class="s">{{source_word}}</p><p class="t">{{tran_word}}</p></div>';

		// 获取划词记录
		storageGet(function (items) {
			var wordList = [];
			for (var key in items) {
				if (Object.prototype.toString.apply(items[key]) == '[object Object]') {
					wordList.push(items[key]);
				}
			}

			// 陌生单词
			for (var i = 0; i < wordList.length; i++) {
				var word = wordList[i];
				var html = Mustache.render(tpl, {source_word: word['source_word'], tran_word: word['translate_word']});

				wordsContainer.append(html);
			}

			// 情景单词
			// 用 location 分组
			var locations = {};
			for (var i = 0; i < wordList.length; i++) {
				var word = wordList[i];
				if (typeof locations[word['location']] == 'undefined') {
					locations[word['location']] = [];
				}
				locations[word['location']].push(word);
			}
			// // 分组后 呈现
			var html2 = '';
			var tpl2 = '<div class="clearfix con2"><h2>{{{location}}}</h2>{{#words}}<div class="word-item"><p class="s">{{{source_word}}}</p><p class="t">{{{translate_word}}}</p></div>{{/words}}</div>';
			for (var location in locations) {
				location2 = location;
				if (location.length > 50) {
					location2 = location.substring(0, 50) + '...';
				}
				var data = {
					'location': location2,
					'words': locations[location]
				}
				html2 += Mustache.render(tpl2, data);
			}
			sceneWordsContainer.append(html2);

			randomColor();
		});

		$('a').click(function(event) {
			event.preventDefault();
		});

		// 随机颜色
		$("#randomWordColor").click(function () {
			randomColor();
		});

		// 陌生单词
		$("#wordsSwither").click(function () {
			showWords();
		});

		// 情景记忆
		$("#sceneSwither").click(function () {
			showSceneWords();
		});

		// 单词君
		$("#aboutMe").click(function () {
			showAboutMe();
		});

		$('a').click(function () {
			var self = $(this);
			if (self.attr('href') && self.attr('href').indexOf('http') != -1) {
				window.open(self.attr('href'));
			}
		});

	});
})(jQuery);
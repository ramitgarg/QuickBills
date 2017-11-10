
/**
 * @external put-selector/put
 * @see https://github.com/kriszyp/put-selector
 */

/**
 * @module
 * A patched version of put-selector that can be built without throwing
 * errors with r.js
 */
//jscs:disable
/* jshint ignore:start */
/* istanbul ignore next */
var forDocument, fragmentFasterHeuristic = /[-+,> ]/, // if it has any of these combinators, it is probably going to be faster with a document fragment
	/* istanbul ignore next */
	factory = /* istanbul ignore next */ function(doc, newFragmentFasterHeuristic){
"use strict";
	// module:
	//		put-selector/put
	// summary:
	//		This module defines a fast lightweight function for updating and creating new elements
	//		terse, CSS selector-based syntax. The single function from this module creates
	//new DOM elements and updates existing elements. See README.md for more information.
	//	examples:
	//		To create a simple div with a class name of "foo":
	//		|	put("div.foo");
	fragmentFasterHeuristic = newFragmentFasterHeuristic || fragmentFasterHeuristic;
	var selectorParse = /(?:\s*([-+ ,<>]))?\s*(\.|!\.?|#)?([-\w\u00A0-\uFFFF%$|]+)?(?:\[([^\]=]+)=?['"]?([^\]'"]*)['"]?\])?/g,
		undefined, namespaceIndex, namespaces = false,
		doc = doc || document,
		ieCreateElement = typeof doc.createElement == "object"; // telltale sign of the old IE behavior with createElement that does not support later addition of name
	function insertTextNode(element, text){
		element.appendChild(doc.createTextNode(text));
	}
	function put(topReferenceElement){
		var fragment, lastSelectorArg, nextSibling, referenceElement, current,
			args = arguments,
			returnValue = args[0]; // use the first argument as the default return value in case only an element is passed in
		function insertLastElement(){
			// we perform insertBefore actions after the element is fully created to work properly with
			// <input> tags in older versions of IE that require type attributes
			//	to be set before it is attached to a parent.
			// We also handle top level as a document fragment actions in a complex creation
			// are done on a detached DOM which is much faster
			// Also if there is a parse error, we generally error out before doing any DOM operations (more atomic)
			if(current && referenceElement && current != referenceElement){
				(referenceElement == topReferenceElement &&
					// top level, may use fragment for faster access
					(fragment ||
						// fragment doesn't exist yet, check to see if we really want to create it
						(fragment = fragmentFasterHeuristic.test(argument) && doc.createDocumentFragment()))
							// any of the above fails just use the referenceElement
							 ? fragment : referenceElement).
								insertBefore(current, nextSibling || null); // do the actual insertion
			}
		}
		for(var i = 0; i < args.length; i++){
			var argument = args[i];
			if(typeof argument == "object"){
				lastSelectorArg = false;
				if(argument instanceof Array){
					// an array
					current = doc.createDocumentFragment();
					for(var key = 0; key < argument.length; key++){
						current.appendChild(put(argument[key]));
					}
					argument = current;
				}
				if(argument.nodeType){
					current = argument;
					insertLastElement();
					referenceElement = argument;
					nextSibling = 0;
				}else{
					// an object hash
					for(var key in argument){
						current[key] = argument[key];
					}
				}
			}else if(lastSelectorArg){
				// a text node should be created
				// take a scalar value, use createTextNode so it is properly escaped
				// createTextNode is generally several times faster than doing an escaped innerHTML insertion: http://jsperf.com/createtextnode-vs-innerhtml/2
				lastSelectorArg = false;
				insertTextNode(current, argument);
			}else{
				if(i < 1){
					// if we are starting with a selector, there is no top element
					topReferenceElement = null;
				}
				lastSelectorArg = true;
				var leftoverCharacters = argument.replace(selectorParse, function(t, combinator, prefix, value, attrName, attrValue){
					if(combinator){
						// insert the last current object
						insertLastElement();
						if(combinator == '-' || combinator == '+'){
							// + or - combinator,
							// TODO: add support for >- as a means of indicating before the first child?
							referenceElement = (nextSibling = (current || referenceElement)).parentNode;
							current = null;
							if(combinator == "+"){
								nextSibling = nextSibling.nextSibling;
							}// else a - operator, again not in CSS, but obvious in it's meaning (create next element before the current/referenceElement)
						}else{
							if(combinator == "<"){
								// parent combinator (not really in CSS, but theorized, and obvious in it's meaning)
								referenceElement = current = (current || referenceElement).parentNode;
							}else{
								if(combinator == ","){
									// comma combinator, start a new selector
									referenceElement = topReferenceElement;
								}else if(current){
									// else descendent or child selector (doesn't matter, treated the same),
									referenceElement = current;
								}
								current = null;
							}
							nextSibling = 0;
						}
						if(current){
							referenceElement = current;
						}
					}
					var tag = !prefix && value;
					if(tag || (!current && (prefix || attrName))){
						if(tag == "$"){
							// this is a variable to be replaced with a text node
							insertTextNode(referenceElement, args[++i]);
						}else{
							// Need to create an element
							tag = tag || put.defaultTag;
							var ieInputName = ieCreateElement && args[i +1] && args[i +1].name;
							if(ieInputName){
								// in IE, we have to use the crazy non-standard createElement to create input's that have a name
								tag = '<' + tag + ' name="' + ieInputName + '">';
							}
							// we swtich between creation methods based on namespace usage
							current = namespaces && ~(namespaceIndex = tag.indexOf('|')) ?
								doc.createElementNS(namespaces[tag.slice(0, namespaceIndex)], tag.slice(namespaceIndex + 1)) :
								doc.createElement(tag);
						}
					}
					if(prefix){
						if(value == "$"){
							value = args[++i];
						}
						if(prefix == "#"){
							// #id was specified
							current.id = value;
						}else{
							// we are in the className addition and removal branch
							var currentClassName = current.className;
							// remove the className (needed for addition or removal)
							// see http://jsperf.com/remove-class-name-algorithm/2 for some tests on this
							var removed = currentClassName && (" " + currentClassName + " ").replace(" " + value + " ", " ");
							if(prefix == "."){
								// addition, add the className
								current.className = currentClassName ? (removed + value).substring(1) : value;
							}else{
								// else a '!' class removal
								if(argument == "!"){
									var parentNode;
									// special signal to delete this element
									if(ieCreateElement){
										// use the ol' innerHTML trick to get IE to do some cleanup
										put("div", current, '<').innerHTML = "";
									}else if(parentNode = current.parentNode){ // intentional assigment
										// use a faster, and more correct (for namespaced elements) removal (http://jsperf.com/removechild-innerhtml)
										parentNode.removeChild(current);
									}
								}else{
									// we already have removed the class, just need to trim
									removed = removed.substring(1, removed.length - 1);
									// only assign if it changed, this can save a lot of time
									if(removed != currentClassName){
										current.className = removed;
									}
								}
							}
							// CSS class removal
						}
					}
					if(attrName){
						if(attrValue == "$"){
							attrValue = args[++i];
						}
						// [name=value]
						if(attrName == "style"){
							// handle the special case of setAttribute not working in old IE
							current.style.cssText = attrValue;
						}else{
							var method = attrName.charAt(0) == "!" ? (attrName = attrName.substring(1)) && 'removeAttribute' : 'setAttribute';
							attrValue = attrValue === '' ? attrName : attrValue;
							// determine if we need to use a namespace
							namespaces && ~(namespaceIndex = attrName.indexOf('|')) ?
								current[method + "NS"](namespaces[attrName.slice(0, namespaceIndex)], attrName.slice(namespaceIndex + 1), attrValue) :
								current[method](attrName, attrValue);
						}
					}
					return '';
				});
				if(leftoverCharacters){
					throw new SyntaxError("Unexpected char " + leftoverCharacters + " in " + argument);
				}
				insertLastElement();
				referenceElement = returnValue = current || referenceElement;
			}
		}
		if(topReferenceElement && fragment){
			// we now insert the top level elements for the fragment if it exists
			topReferenceElement.appendChild(fragment);
		}
		return returnValue;
	}
	put.addNamespace = function(name, uri){
		if(doc.createElementNS){
			(namespaces || (namespaces = {}))[name] = uri;
		}else{
			// for old IE
			doc.namespaces.add(name, uri);
		}
	};
	put.defaultTag = "div";
	put.forDocument = forDocument;
	return put;
};

/* istanbul ignore next */
(function(factory){
	factory = factory || deps;
	if(typeof define === "function" && define.amd){
		// AMD loader
		define('hui/table/put',[], factory);
	}else if(typeof window == "undefined"){
		// server side JavaScript, probably (hopefully) NodeJS
		require("./node-html")(module, factory);
	}else{
		// plain script in a browser
		put = factory();
	}
})(factory);
/* jshint ignore:end */
;
define('dgrid-0.4/util/misc',[
	'dojo/_base/kernel',
	'dojo/has',
	'put-selector/put'
], function (kernel, has, put) {
	// summary:
	//		This module defines miscellaneous utility methods for purposes of
	//		adding styles, and throttling/debouncing function calls.

	has.add('dom-contains', function (global, doc, element) {
		return !!element.contains; // not supported by FF < 9
	});

	// establish an extra stylesheet which addCssRule calls will use,
	// plus an array to track actual indices in stylesheet for removal
	var extraRules = [],
		extraSheet,
		removeMethod,
		rulesProperty,
		invalidCssChars = /([^A-Za-z0-9_\u00A0-\uFFFF-])/g;

	function removeRule(index) {
		// Function called by the remove method on objects returned by addCssRule.
		var realIndex = extraRules[index],
			i, l;
		if (realIndex === undefined) {
			return; // already removed
		}

		// remove rule indicated in internal array at index
		extraSheet[removeMethod](realIndex);

		// Clear internal array item representing rule that was just deleted.
		// NOTE: we do NOT splice, since the point of this array is specifically
		// to negotiate the splicing that occurs in the stylesheet itself!
		extraRules[index] = undefined;

		// Then update array items as necessary to downshift remaining rule indices.
		// Can start at index + 1, since array is sparse but strictly increasing.
		for (i = index + 1, l = extraRules.length; i < l; i++) {
			if (extraRules[i] > realIndex) {
				extraRules[i]--;
			}
		}
	}

	var util = {
		// Throttle/debounce functions

		defaultDelay: 15,
		throttle: function (cb, context, delay) {
			// summary:
			//		Returns a function which calls the given callback at most once per
			//		delay milliseconds.  (Inspired by plugd)
			var ran = false;
			delay = delay || util.defaultDelay;
			return function () {
				if (ran) {
					return;
				}
				ran = true;
				cb.apply(context, arguments);
				setTimeout(function () {
					ran = false;
				}, delay);
			};
		},
		throttleDelayed: function (cb, context, delay) {
			// summary:
			//		Like throttle, except that the callback runs after the delay,
			//		rather than before it.
			var ran = false;
			delay = delay || util.defaultDelay;
			return function () {
				if (ran) {
					return;
				}
				ran = true;
				var a = arguments;
				setTimeout(function () {
					ran = false;
					cb.apply(context, a);
				}, delay);
			};
		},
		debounce: function (cb, context, delay) {
			// summary:
			//		Returns a function which calls the given callback only after a
			//		certain time has passed without successive calls.  (Inspired by plugd)
			var timer;
			delay = delay || util.defaultDelay;
			return function () {
				if (timer) {
					clearTimeout(timer);
					timer = null;
				}
				var a = arguments;
				timer = setTimeout(function () {
					cb.apply(context, a);
				}, delay);
			};
		},

		// Iterative functions

		each: function (arrayOrObject, callback, context) {
			// summary:
			//		Given an array or object, iterates through its keys.
			//		Does not use hasOwnProperty (since even Dojo does not
			//		consistently use it), but will iterate using a for or for-in
			//		loop as appropriate.

			var i, len;

			if (!arrayOrObject) {
				return;
			}

			if (typeof arrayOrObject.length === 'number') {
				for (i = 0, len = arrayOrObject.length; i < len; i++) {
					callback.call(context, arrayOrObject[i], i, arrayOrObject);
				}
			}
			else {
				for (i in arrayOrObject) {
					callback.call(context, arrayOrObject[i], i, arrayOrObject);
				}
			}
		},

		// DOM-related functions

		contains: function (parent, node) {
			// summary:
			//		Checks if an element is contained within another element.
			//		Deprecated in favor of Node#contains, which all browsers support.

			kernel.deprecated('miscUtil.contains',
				'Use Node#contains instead, which all browsers supported by dgrid already support.', '1.0');
			return parent.contains(node);
		},

		// CSS-related functions

		addCssRule: function (selector, css) {
			// summary:
			//		Dynamically adds a style rule to the document.  Returns an object
			//		with a remove method which can be called to later remove the rule.

			if (!extraSheet) {
				// First time, create an extra stylesheet for adding rules
				extraSheet = put(document.getElementsByTagName('head')[0], 'style');
				// Keep reference to actual StyleSheet object (`styleSheet` for IE < 9)
				extraSheet = extraSheet.sheet || extraSheet.styleSheet;
				// Store name of method used to remove rules (`removeRule` for IE < 9)
				removeMethod = extraSheet.deleteRule ? 'deleteRule' : 'removeRule';
				// Store name of property used to access rules (`rules` for IE < 9)
				rulesProperty = extraSheet.cssRules ? 'cssRules' : 'rules';
			}

			var index = extraRules.length;
			extraRules[index] = (extraSheet.cssRules || extraSheet.rules).length;
			extraSheet.addRule ?
				extraSheet.addRule(selector, css) :
				extraSheet.insertRule(selector + '{' + css + '}', extraRules[index]);

			return {
				get: function (prop) {
					return extraSheet[rulesProperty][extraRules[index]].style[prop];
				},
				set: function (prop, value) {
					if (typeof extraRules[index] !== 'undefined') {
						extraSheet[rulesProperty][extraRules[index]].style[prop] = value;
					}
				},
				remove: function () {
					removeRule(index);
				}
			};
		},

		escapeCssIdentifier: function (id, replace) {
			// summary:
			//		Escapes normally-invalid characters in a CSS identifier (such as . or :);
			//		see http://www.w3.org/TR/CSS2/syndata.html#value-def-identifier
			// id: String
			//		CSS identifier (e.g. tag name, class, or id) to be escaped
			// replace: String?
			//		If specified, indicates that invalid characters should be
			//		replaced by the given string rather than being escaped

			return typeof id === 'string' ? id.replace(invalidCssChars, replace || '\\$1') : id;
		}
	};
	return util;
});

define('dgrid-0.4/List',[
	'dojo/_base/declare',
	'dojo/on',
	'dojo/has',
	'./util/misc',
	'xstyle/has-class',
	'put-selector/put',
	'dojo/_base/sniff',
	'xstyle/css!./css/dgrid.css'
], function (declare, listen, has, miscUtil, hasClass, put) {
	// Add user agent/feature CSS classes
	hasClass('mozilla', 'touch');

	// Add a feature test for pointer (only Dojo 1.10 has pointer-events and MSPointer tests)
	has.add('pointer', function (global) {
		return 'PointerEvent' in global ? 'pointer' :
			'MSPointerEvent' in global ? 'MSPointer' : false;
	});

	var oddClass = 'dgrid-row-odd',
		evenClass = 'dgrid-row-even',
		scrollbarWidth, scrollbarHeight;

	function byId(id) {
		return document.getElementById(id);
	}

	function cleanupTestElement(element) {
		element.className = '';
		if (element.parentNode) {
			document.body.removeChild(element);
		}
	}

	function getScrollbarSize(element, dimension) {
		// Used by has tests for scrollbar width/height
		put(document.body, element, '.dgrid-scrollbar-measure');
		var size = element['offset' + dimension] - element['client' + dimension];
		cleanupTestElement(element);
		return size;
	}
	has.add('dom-scrollbar-width', function (global, doc, element) {
		return getScrollbarSize(element, 'Width');
	});
	has.add('dom-scrollbar-height', function (global, doc, element) {
		return getScrollbarSize(element, 'Height');
	});

	has.add('dom-rtl-scrollbar-left', function (global, doc, element) {
		var div = put('div'),
			isLeft;

		put(document.body, element, '.dgrid-scrollbar-measure[dir=rtl]');
		put(element, div);

		// position: absolute makes modern IE and Edge always report child's offsetLeft as 0,
		// but other browsers factor in the position of the scrollbar if it is to the left.
		// All versions of IE and Edge are known to move the scrollbar to the left side for rtl.
		isLeft = !!has('ie') || !!has('trident') || /\bEdge\//.test(navigator.userAgent) ||
			div.offsetLeft >= has('dom-scrollbar-width');
		cleanupTestElement(element);
		put(div, '!');
		element.removeAttribute('dir');
		return isLeft;
	});

	// var and function for autogenerating ID when one isn't provided
	var autoId = 0;
	function generateId() {
		return List.autoIdPrefix + autoId++;
	}

	// common functions for class and className setters/getters
	// (these are run in instance context)
	var spaceRx = / +/g;
	function setClass(cls) {
		// Format input appropriately for use with put...
		var putClass = cls ? '.' + cls.replace(spaceRx, '.') : '';

		// Remove any old classes, and add new ones.
		if (this._class) {
			putClass = '!' + this._class.replace(spaceRx, '!') + putClass;
		}
		put(this.domNode, putClass);

		// Store for later retrieval/removal.
		this._class = cls;
	}
	function getClass() {
		return this._class;
	}

	// window resize event handler, run in context of List instance
	var winResizeHandler = function () {
		if (this._started) {
			this.resize();
		}
	};

	var List = declare(null, {
		tabableHeader: false,

		// showHeader: Boolean
		//		Whether to render header (sub)rows.
		showHeader: false,

		// showFooter: Boolean
		//		Whether to render footer area.  Extensions which display content
		//		in the footer area should set this to true.
		showFooter: false,

		// maintainOddEven: Boolean
		//		Whether to maintain the odd/even classes when new rows are inserted.
		//		This can be disabled to improve insertion performance if odd/even styling is not employed.
		maintainOddEven: true,

		// cleanAddedRules: Boolean
		//		Whether to track rules added via the addCssRule method to be removed
		//		when the list is destroyed.  Note this is effective at the time of
		//		the call to addCssRule, not at the time of destruction.
		cleanAddedRules: true,

		// addUiClasses: Boolean
		//		Whether to add jQuery UI classes to various elements in dgrid's DOM.
		addUiClasses: true,

		// highlightDuration: Integer
		//		The amount of time (in milliseconds) that a row should remain
		//		highlighted after it has been updated.
		highlightDuration: 250,

		postscript: function (params, srcNodeRef) {
			// perform setup and invoke create in postScript to allow descendants to
			// perform logic before create/postCreate happen (a la dijit/_WidgetBase)
			var grid = this;

			(this._Row = function (id, object, element) {
				this.id = id;
				this.data = object;
				this.element = element;
			}).prototype.remove = function () {
				grid.removeRow(this.element);
			};

			if (srcNodeRef) {
				// normalize srcNodeRef and store on instance during create process.
				// Doing this in postscript is a bit earlier than dijit would do it,
				// but allows subclasses to access it pre-normalized during create.
				this.srcNodeRef = srcNodeRef =
					srcNodeRef.nodeType ? srcNodeRef : byId(srcNodeRef);
			}
			this.create(params, srcNodeRef);
		},
		listType: 'list',

		create: function (params, srcNodeRef) {
			var domNode = this.domNode = srcNodeRef || put('div'),
				cls;

			if (params) {
				this.params = params;
				declare.safeMixin(this, params);

				// Check for initial class or className in params or on domNode
				cls = params['class'] || params.className || domNode.className;
			}

			// ensure arrays and hashes are initialized
			this.sort = this.sort || [];
			this._listeners = [];
			this._rowIdToObject = {};

			this.postMixInProperties && this.postMixInProperties();

			// Apply id to widget and domNode,
			// from incoming node, widget params, or autogenerated.
			this.id = domNode.id = domNode.id || this.id || generateId();

			// Perform initial rendering, and apply classes if any were specified.
			this.buildRendering();
			if (cls) {
				setClass.call(this, cls);
			}

			this.postCreate();

			// remove srcNodeRef instance property post-create
			delete this.srcNodeRef;
			// to preserve "it just works" behavior, call startup if we're visible
			if (this.domNode.offsetHeight) {
				this.startup();
			}
		},
		buildRendering: function () {
			var domNode = this.domNode,
				addUiClasses = this.addUiClasses,
				self = this,
				headerNode, bodyNode, footerNode, isRTL;

			// Detect RTL on html/body nodes; taken from dojo/dom-geometry
			isRTL = this.isRTL = (document.body.dir || document.documentElement.dir ||
				document.body.style.direction).toLowerCase() === 'rtl';

			// Clear out className (any pre-applied classes will be re-applied via the
			// class / className setter), then apply standard classes/attributes
			domNode.className = '';

			put(domNode, '[role=grid].dgrid.dgrid-' + this.listType +
				(addUiClasses ? '.ui-widget' : ''));

			// Place header node (initially hidden if showHeader is false).
			headerNode = this.headerNode = put(domNode,
				'div.dgrid-header.dgrid-header-row' +
				(addUiClasses ? '.ui-widget-header' : '') +
				(this.showHeader ? '' : '.dgrid-header-hidden'));
			bodyNode = this.bodyNode = put(domNode, 'div.dgrid-scroller');

			// Firefox 4+ adds overflow: auto elements to the tab index by default;
			// force them to not be tabbable, but restrict this to Firefox,
			// since it breaks accessibility support in other browsers
			if (has('ff')) {
				bodyNode.tabIndex = -1;
			}

			this.headerScrollNode = put(domNode, 'div.dgrid-header.dgrid-header-scroll.dgrid-scrollbar-width' +
				(addUiClasses ? '.ui-widget-header' : ''));

			// Place footer node (initially hidden if showFooter is false).
			footerNode = this.footerNode = put('div.dgrid-footer' +
				(this.showFooter ? '' : '.dgrid-footer-hidden'));
			put(domNode, footerNode);

			if (isRTL) {
				domNode.className += ' dgrid-rtl' +
					(has('dom-rtl-scrollbar-left') ? ' dgrid-rtl-swap' : '');
			}

			listen(bodyNode, 'scroll', function (event) {
				if (self.showHeader) {
					// keep the header aligned with the body
					headerNode.scrollLeft = event.scrollLeft || bodyNode.scrollLeft;
				}
				// re-fire, since browsers are not consistent about propagation here
				event.stopPropagation();
				listen.emit(domNode, 'scroll', {scrollTarget: bodyNode});
			});
			this.configStructure();
			this.renderHeader();

			this.contentNode = this.touchNode = put(this.bodyNode,
				'div.dgrid-content' + (addUiClasses ? '.ui-widget-content' : ''));
			// add window resize handler, with reference for later removal if needed
			this._listeners.push(this._resizeHandle = listen(window, 'resize',
				miscUtil.throttleDelayed(winResizeHandler, this)));
		},

		postCreate: function () {
		},

		startup: function () {
			// summary:
			//		Called automatically after postCreate if the component is already
			//		visible; otherwise, should be called manually once placed.

			if (this._started) {
				return;
			}
			this.inherited(arguments);
			this._started = true;
			this.resize();
			// apply sort (and refresh) now that we're ready to render
			this.set('sort', this.sort);
		},

		configStructure: function () {
			// does nothing in List, this is more of a hook for the Grid
		},
		resize: function () {
			var bodyNode = this.bodyNode,
				headerNode = this.headerNode,
				footerNode = this.footerNode,
				headerHeight = headerNode.offsetHeight,
				footerHeight = this.showFooter ? footerNode.offsetHeight : 0;

			this.headerScrollNode.style.height = bodyNode.style.marginTop = headerHeight + 'px';
			bodyNode.style.marginBottom = footerHeight + 'px';

			if (!scrollbarWidth) {
				// Measure the browser's scrollbar width using a DIV we'll delete right away
				scrollbarWidth = has('dom-scrollbar-width');
				scrollbarHeight = has('dom-scrollbar-height');

				// Avoid issues with certain widgets inside in IE7, and
				// ColumnSet scroll issues with all supported IE versions
				if (has('ie')) {
					scrollbarWidth++;
					scrollbarHeight++;
				}

				// add rules that can be used where scrollbar width/height is needed
				miscUtil.addCssRule('.dgrid-scrollbar-width', 'width: ' + scrollbarWidth + 'px');
				miscUtil.addCssRule('.dgrid-scrollbar-height', 'height: ' + scrollbarHeight + 'px');

				if (scrollbarWidth !== 17) {
					// for modern browsers, we can perform a one-time operation which adds
					// a rule to account for scrollbar width in all grid headers.
					miscUtil.addCssRule('.dgrid-header-row', 'right: ' + scrollbarWidth + 'px');
					// add another for RTL grids
					miscUtil.addCssRule('.dgrid-rtl-swap .dgrid-header-row', 'left: ' + scrollbarWidth + 'px');
				}
			}
		},

		addCssRule: function (selector, css) {
			// summary:
			//		Version of util/misc.addCssRule which tracks added rules and removes
			//		them when the List is destroyed.

			var rule = miscUtil.addCssRule(selector, css);
			if (this.cleanAddedRules) {
				// Although this isn't a listener, it shares the same remove contract
				this._listeners.push(rule);
			}
			return rule;
		},

		on: function (eventType, listener) {
			// delegate events to the domNode
			var signal = listen(this.domNode, eventType, listener);
			if (!has('dom-addeventlistener')) {
				this._listeners.push(signal);
			}
			return signal;
		},

		cleanup: function () {
			// summary:
			//		Clears out all rows currently in the list.

			var i;
			for (i in this._rowIdToObject) {
				if (this._rowIdToObject[i] !== this.columns) {
					var rowElement = byId(i);
					if (rowElement) {
						this.removeRow(rowElement, true);
					}
				}
			}
		},
		destroy: function () {
			// summary:
			//		Destroys this grid

			// Remove any event listeners and other such removables
			if (this._listeners) { // Guard against accidental subsequent calls to destroy
				for (var i = this._listeners.length; i--;) {
					this._listeners[i].remove();
				}
				this._listeners = null;
			}

			this._started = false;
			this.cleanup();
			// destroy DOM
			put(this.domNode, '!');
		},
		refresh: function () {
			// summary:
			//		refreshes the contents of the grid
			this.cleanup();
			this._rowIdToObject = {};
			this._autoRowId = 0;

			// make sure all the content has been removed so it can be recreated
			this.contentNode.innerHTML = '';
			// Ensure scroll position always resets (especially for TouchScroll).
			this.scrollTo({ x: 0, y: 0 });
		},

		highlightRow: function (rowElement, delay) {
			// summary:
			//		Highlights a row.  Used when updating rows due to store
			//		notifications, but potentially also useful in other cases.
			// rowElement: Object
			//		Row element (or object returned from the row method) to
			//		highlight.
			// delay: Number
			//		Number of milliseconds between adding and removing the
			//		ui-state-highlight class.

			rowElement = rowElement.element || rowElement;
			put(rowElement, '.dgrid-highlight' +
				(this.addUiClasses ? '.ui-state-highlight' : ''));
			setTimeout(function () {
				put(rowElement, '!dgrid-highlight!ui-state-highlight');
			}, delay || this.highlightDuration);
		},

		adjustRowIndices: function (firstRow) {
			// this traverses through rows to maintain odd/even classes on the rows when indexes shift;
			var next = firstRow;
			var rowIndex = next.rowIndex;
			if (rowIndex > -1) { // make sure we have a real number in case this is called on a non-row
				do {
					// Skip non-numeric, non-rows
					if (next.rowIndex > -1) {
						if (this.maintainOddEven) {
							if ((next.className + ' ').indexOf('dgrid-row ') > -1) {
								put(next, '.' + (rowIndex % 2 === 1 ? oddClass : evenClass) + '!' +
									(rowIndex % 2 === 0 ? oddClass : evenClass));
							}
						}
						next.rowIndex = rowIndex++;
					}
				} while ((next = next.nextSibling) && next.rowIndex !== rowIndex);
			}
		},
		renderArray: function (results, beforeNode, options) {
			// summary:
			//		Renders an array of objects as rows, before the given node.

			options = options || {};
			var self = this,
				start = options.start || 0,
				rowsFragment = document.createDocumentFragment(),
				rows = [],
				container,
				i = 0,
				len = results.length;

			if (!beforeNode) {
				this._lastCollection = results;
			}

			// Insert a row for each item into the document fragment
			while (i < len) {
				rows[i] = this.insertRow(results[i], rowsFragment, null, start++, options);
				i++;
			}

			// Insert the document fragment into the appropriate position
			container = beforeNode ? beforeNode.parentNode : self.contentNode;
			if (container && container.parentNode &&
					(container !== self.contentNode || len)) {
				container.insertBefore(rowsFragment, beforeNode || null);
				if (len) {
					self.adjustRowIndices(rows[len - 1]);
				}
			}

			return rows;
		},

		renderHeader: function () {
			// no-op in a plain list
		},

		_autoRowId: 0,
		insertRow: function (object, parent, beforeNode, i, options) {
			// summary:
			//		Creates a single row in the grid.

			// Include parentId within row identifier if one was specified in options.
			// (This is used by tree to allow the same object to appear under
			// multiple parents.)
			var id = this.id + '-row-' + ((this.collection && this.collection.getIdentity) ?
					this.collection.getIdentity(object) : this._autoRowId++),
				row = byId(id),
				previousRow = row && row.previousSibling;

			if (row) {
				// If it existed elsewhere in the DOM, we will remove it, so we can recreate it
				if (row === beforeNode) {
					beforeNode = (beforeNode.connected || beforeNode).nextSibling;
				}
				this.removeRow(row, false, options);
			}
			row = this.renderRow(object, options);
			row.className = (row.className || '') + ' dgrid-row ' +
				(i % 2 === 1 ? oddClass : evenClass) +
				(this.addUiClasses ? ' ui-state-default' : '');
			// Get the row id for easy retrieval
			this._rowIdToObject[row.id = id] = object;
			parent.insertBefore(row, beforeNode || null);

			row.rowIndex = i;
			if (previousRow && previousRow.rowIndex !== (row.rowIndex - 1)) {
				// In this case, we are pulling the row from another location in the grid,
				// and we need to readjust the rowIndices from the point it was removed
				this.adjustRowIndices(previousRow);
			}
			return row;
		},
		renderRow: function (value) {
			// summary:
			//		Responsible for returning the DOM for a single row in the grid.
			// value: Mixed
			//		Value to render
			// options: Object?
			//		Optional object with additional options

			return put('div', '' + value);
		},
		removeRow: function (rowElement, preserveDom) {
			// summary:
			//		Simply deletes the node in a plain List.
			//		Column plugins may aspect this to implement their own cleanup routines.
			// rowElement: Object|DOMNode
			//		Object or element representing the row to be removed.
			// preserveDom: Boolean?
			//		If true, the row element will not be removed from the DOM; this can
			//		be used by extensions/plugins in cases where the DOM will be
			//		massively cleaned up at a later point in time.
			// options: Object?
			//		May be specified with a `rows` property for the purpose of
			//		cleaning up collection tracking (used by `_StoreMixin`).

			rowElement = rowElement.element || rowElement;
			delete this._rowIdToObject[rowElement.id];
			if (!preserveDom) {
				put(rowElement, '!');
			}
		},

		row: function (target) {
			// summary:
			//		Get the row object by id, object, node, or event
			var id;

			if (target instanceof this._Row) {
				return target; // No-op; already a row
			}

			if (target.target && target.target.nodeType) {
				// Event
				target = target.target;
			}
			if (target.nodeType) {
				// Row element, or child of a row element
				var object;
				do {
					var rowId = target.id;
					if ((object = this._rowIdToObject[rowId])) {
						return new this._Row(rowId.substring(this.id.length + 5), object, target);
					}
					target = target.parentNode;
				}while (target && target !== this.domNode);
				return;
			}

			if (typeof target === 'object') {
				// Assume target represents a collection item
				id = this.collection.getIdentity(target);
			}
			else {
				// Assume target is a row ID
				id = target;
				target = this._rowIdToObject[this.id + '-row-' + id];
			}
			return new this._Row(id, target, byId(this.id + '-row-' + id));
		},
		cell: function (target) {
			// this doesn't do much in a plain list
			return {
				row: this.row(target)
			};
		},

		_move: function (item, steps, targetClass, visible) {
			var nextSibling, current, element;
			// Start at the element indicated by the provided row or cell object.
			element = current = item.element;
			steps = steps || 1;

			do {
				// Outer loop: move in the appropriate direction.
				if ((nextSibling = current[steps < 0 ? 'previousSibling' : 'nextSibling'])) {
					do {
						// Inner loop: advance, and dig into children if applicable.
						current = nextSibling;
						if (current && (current.className + ' ').indexOf(targetClass + ' ') > -1) {
							// Element with the appropriate class name; count step, stop digging.
							element = current;
							steps += steps < 0 ? 1 : -1;
							break;
						}
						// If the next sibling isn't a match, drill down to search, unless
						// visible is true and children are hidden.
					} while ((nextSibling = (!visible || !current.hidden) &&
						current[steps < 0 ? 'lastChild' : 'firstChild']));
				}
				else {
					current = current.parentNode;
					if (!current || current === this.bodyNode || current === this.headerNode) {
						// Break out if we step out of the navigation area entirely.
						break;
					}
				}
			}while (steps);
			// Return the final element we arrived at, which might still be the
			// starting element if we couldn't navigate further in that direction.
			return element;
		},

		up: function (row, steps, visible) {
			// summary:
			//		Returns the row that is the given number of steps (1 by default)
			//		above the row represented by the given object.
			// row:
			//		The row to navigate upward from.
			// steps:
			//		Number of steps to navigate up from the given row; default is 1.
			// visible:
			//		If true, rows that are currently hidden (i.e. children of
			//		collapsed tree rows) will not be counted in the traversal.
			// returns:
			//		A row object representing the appropriate row.  If the top of the
			//		list is reached before the given number of steps, the first row will
			//		be returned.
			if (!row.element) {
				row = this.row(row);
			}
			return this.row(this._move(row, -(steps || 1), 'dgrid-row', visible));
		},
		down: function (row, steps, visible) {
			// summary:
			//		Returns the row that is the given number of steps (1 by default)
			//		below the row represented by the given object.
			// row:
			//		The row to navigate downward from.
			// steps:
			//		Number of steps to navigate down from the given row; default is 1.
			// visible:
			//		If true, rows that are currently hidden (i.e. children of
			//		collapsed tree rows) will not be counted in the traversal.
			// returns:
			//		A row object representing the appropriate row.  If the bottom of the
			//		list is reached before the given number of steps, the last row will
			//		be returned.
			if (!row.element) {
				row = this.row(row);
			}
			return this.row(this._move(row, steps || 1, 'dgrid-row', visible));
		},

		scrollTo: function (options) {
			if (typeof options.x !== 'undefined') {
				this.bodyNode.scrollLeft = options.x;
			}
			if (typeof options.y !== 'undefined') {
				this.bodyNode.scrollTop = options.y;
			}
		},

		getScrollPosition: function () {
			return {
				x: this.bodyNode.scrollLeft,
				y: this.bodyNode.scrollTop
			};
		},

		get: function (/*String*/ name /*, ... */) {
			// summary:
			//		Get a property on a List instance.
			//	name:
			//		The property to get.
			//	returns:
			//		The property value on this List instance.
			// description:
			//		Get a named property on a List object. The property may
			//		potentially be retrieved via a getter method in subclasses. In the base class
			//		this just retrieves the object's property.

			var fn = '_get' + name.charAt(0).toUpperCase() + name.slice(1);

			if (typeof this[fn] === 'function') {
				return this[fn].apply(this, [].slice.call(arguments, 1));
			}

			// Alert users that try to use Dijit-style getter/setters so they don’t get confused
			// if they try to use them and it does not work
			if (!has('dojo-built') && typeof this[fn + 'Attr'] === 'function') {
				console.warn('dgrid: Use ' + fn + ' instead of ' + fn + 'Attr for getting ' + name);
			}

			return this[name];
		},

		set: function (/*String*/ name, /*Object*/ value /*, ... */) {
			//	summary:
			//		Set a property on a List instance
			//	name:
			//		The property to set.
			//	value:
			//		The value to set in the property.
			//	returns:
			//		The function returns this List instance.
			//	description:
			//		Sets named properties on a List object.
			//		A programmatic setter may be defined in subclasses.
			//
			//		set() may also be called with a hash of name/value pairs, ex:
			//	|	myObj.set({
			//	|		foo: "Howdy",
			//	|		bar: 3
			//	|	})
			//		This is equivalent to calling set(foo, "Howdy") and set(bar, 3)

			if (typeof name === 'object') {
				for (var k in name) {
					this.set(k, name[k]);
				}
			}
			else {
				var fn = '_set' + name.charAt(0).toUpperCase() + name.slice(1);

				if (typeof this[fn] === 'function') {
					this[fn].apply(this, [].slice.call(arguments, 1));
				}
				else {
					// Alert users that try to use Dijit-style getter/setters so they don’t get confused
					// if they try to use them and it does not work
					if (!has('dojo-built') && typeof this[fn + 'Attr'] === 'function') {
						console.warn('dgrid: Use ' + fn + ' instead of ' + fn + 'Attr for setting ' + name);
					}

					this[name] = value;
				}
			}

			return this;
		},

		// Accept both class and className programmatically to set domNode class.
		_getClass: getClass,
		_setClass: setClass,
		_getClassName: getClass,
		_setClassName: setClass,

		_setSort: function (property, descending) {
			// summary:
			//		Sort the content
			// property: String|Array
			//		String specifying field to sort by, or actual array of objects
			//		with property and descending properties
			// descending: boolean
			//		In the case where property is a string, this argument
			//		specifies whether to sort ascending (false) or descending (true)

			this.sort = typeof property !== 'string' ? property :
				[{property: property, descending: descending}];

			this._applySort();
		},

		_applySort: function () {
			// summary:
			//		Applies the current sort
			// description:
			//		This is an extension point to allow specializations to apply the sort differently

			this.refresh();

			if (this._lastCollection) {
				var sort = this.sort;
				if (sort && sort.length > 0) {
					var property = sort[0].property,
						descending = !!sort[0].descending;
					this._lastCollection.sort(function (a, b) {
						var aVal = a[property], bVal = b[property];
						// fall back undefined values to "" for more consistent behavior
						if (aVal === undefined) {
							aVal = '';
						}
						if (bVal === undefined) {
							bVal = '';
						}
						return aVal === bVal ? 0 : (aVal > bVal !== descending ? 1 : -1);
					});
				}
				this.renderArray(this._lastCollection);
			}
		},

		_setShowHeader: function (show) {
			// this is in List rather than just in Grid, primarily for two reasons:
			// (1) just in case someone *does* want to show a header in a List
			// (2) helps address IE < 8 header display issue in List

			var headerNode = this.headerNode;

			this.showHeader = show;

			// add/remove class which has styles for "hiding" header
			put(headerNode, (show ? '!' : '.') + 'dgrid-header-hidden');

			this.renderHeader();
			this.resize(); // resize to account for (dis)appearance of header

			if (show) {
				// Update scroll position of header to make sure it's in sync.
				headerNode.scrollLeft = this.getScrollPosition().x;
			}
		},

		_setShowFooter: function (show) {
			this.showFooter = show;

			// add/remove class which has styles for hiding footer
			put(this.footerNode, (show ? '!' : '.') + 'dgrid-footer-hidden');

			this.resize(); // to account for (dis)appearance of footer
		}
	});

	List.autoIdPrefix = 'dgrid_';

	return List;
});

define('dgrid-0.4/Grid',[
	'dojo/_base/declare',
	'dojo/_base/kernel',
	'dojo/on',
	'dojo/has',
	'put-selector/put',
	'./List',
	'./util/misc',
	'dojo/_base/sniff'
], function (declare, kernel, listen, has, put, List, miscUtil) {
	function appendIfNode(parent, subNode) {
		if (subNode && subNode.nodeType) {
			parent.appendChild(subNode);
		}
	}

	function replaceInvalidChars(str) {
		// Replaces invalid characters for a CSS identifier with hyphen,
		// as dgrid does for field names / column IDs when adding classes.
		return miscUtil.escapeCssIdentifier(str, '-');
	}

	var Grid = declare(List, {
		columns: null,
		// cellNavigation: Boolean
		//		This indicates that focus is at the cell level. This may be set to false to cause
		//		focus to be at the row level, which is useful if you want only want row-level
		//		navigation.
		cellNavigation: true,
		tabableHeader: true,
		showHeader: true,
		column: function (target) {
			// summary:
			//		Get the column object by node, or event, or a columnId
			if (typeof target !== 'object') {
				return this.columns[target];
			}
			else {
				return this.cell(target).column;
			}
		},
		listType: 'grid',
		cell: function (target, columnId) {
			// summary:
			//		Get the cell object by node, or event, id, plus a columnId

			if (target.column && target.element) {
				return target;
			}

			if (target.target && target.target.nodeType) {
				// event
				target = target.target;
			}
			var element;
			if (target.nodeType) {
				do {
					if (this._rowIdToObject[target.id]) {
						break;
					}
					var colId = target.columnId;
					if (colId) {
						columnId = colId;
						element = target;
						break;
					}
					target = target.parentNode;
				} while (target && target !== this.domNode);
			}
			if (!element && typeof columnId !== 'undefined') {
				var row = this.row(target),
					rowElement = row && row.element;
				if (rowElement) {
					var elements = rowElement.getElementsByTagName('td');
					for (var i = 0; i < elements.length; i++) {
						if (elements[i].columnId === columnId) {
							element = elements[i];
							break;
						}
					}
				}
			}
			if (target != null) {
				return {
					row: row || this.row(target),
					column: columnId && this.column(columnId),
					element: element
				};
			}
		},

		createRowCells: function (tag, each, subRows, object) {
			// summary:
			//		Generates the grid for each row (used by renderHeader and and renderRow)
			var row = put('table.dgrid-row-table[role=presentation]'),
				// IE < 9 needs an explicit tbody; other browsers do not
				tbody = (has('ie') < 9) ? put(row, 'tbody') : row,
				tr,
				si, sl, i, l, // iterators
				subRow, column, id, extraClasses, className,
				cell, colSpan, rowSpan; // used inside loops

			// Allow specification of custom/specific subRows, falling back to
			// those defined on the instance.
			subRows = subRows || this.subRows;

			for (si = 0, sl = subRows.length; si < sl; si++) {
				subRow = subRows[si];
				// for single-subrow cases in modern browsers, TR can be skipped
				// http://jsperf.com/table-without-trs
				tr = put(tbody, 'tr');
				if (subRow.className) {
					put(tr, '.' + subRow.className);
				}

				for (i = 0, l = subRow.length; i < l; i++) {
					// iterate through the columns
					column = subRow[i];
					id = column.id;

					extraClasses = column.field ?
						'.field-' + replaceInvalidChars(column.field) :
						'';
					className = typeof column.className === 'function' ?
						column.className(object) : column.className;
					if (className) {
						extraClasses += '.' + className;
					}

					cell = put(tag +
						'.dgrid-cell' +
						(id ? '.dgrid-column-' + replaceInvalidChars(id) : '') +
						extraClasses.replace(/ +/g, '.') +
						'[role=' + (tag === 'th' ? 'columnheader' : 'gridcell') + ']');
					cell.columnId = id;
					colSpan = column.colSpan;
					if (colSpan) {
						cell.colSpan = colSpan;
					}
					rowSpan = column.rowSpan;
					if (rowSpan) {
						cell.rowSpan = rowSpan;
					}
					each(cell, column);
					// add the td to the tr at the end for better performance
					tr.appendChild(cell);
				}
			}
			return row;
		},

		left: function (cell, steps) {
			if (!cell.element) {
				cell = this.cell(cell);
			}
			return this.cell(this._move(cell, -(steps || 1), 'dgrid-cell'));
		},
		right: function (cell, steps) {
			if (!cell.element) {
				cell = this.cell(cell);
			}
			return this.cell(this._move(cell, steps || 1, 'dgrid-cell'));
		},

		_defaultRenderCell: function (object, value, td) {
			// summary:
			//		Default renderCell implementation.
			//		NOTE: Called in context of column definition object.
			// object: Object
			//		The data item for the row currently being rendered
			// value: Mixed
			//		The value of the field applicable to the current cell
			// td: DOMNode
			//		The cell element representing the current item/field
			// options: Object?
			//		Any additional options passed through from renderRow

			if (this.formatter) {
				// Support formatter, with or without formatterScope
				var formatter = this.formatter,
					formatterScope = this.grid.formatterScope;
				td.innerHTML = typeof formatter === 'string' && formatterScope ?
					formatterScope[formatter](value, object) : this.formatter(value, object);
			}
			else if (value != null) {
				td.appendChild(document.createTextNode(value));
			}
		},

		renderRow: function (object, options) {
			var self = this;
			var row = this.createRowCells('td', function (td, column) {
				var data = object;
				// Support get function or field property (similar to DataGrid)
				if (column.get) {
					data = column.get(object);
				}
				else if ('field' in column && column.field !== '_item') {
					data = data[column.field];
				}

				if (column.renderCell) {
					// A column can provide a renderCell method to do its own DOM manipulation,
					// event handling, etc.
					appendIfNode(td, column.renderCell(object, data, td, options));
				}
				else {
					self._defaultRenderCell.call(column, object, data, td, options);
				}
			}, options && options.subRows, object);
			// row gets a wrapper div for a couple reasons:
			// 1. So that one can set a fixed height on rows (heights can't be set on <table>'s AFAICT)
			// 2. So that outline style can be set on a row when it is focused,
			// and Safari's outline style is broken on <table>
			return put('div[role=row]>', row);
		},
		renderHeader: function () {
			// summary:
			//		Setup the headers for the grid
			var grid = this,
				headerNode = this.headerNode,
				i = headerNode.childNodes.length;

			headerNode.setAttribute('role', 'row');

			// clear out existing header in case we're resetting
			while (i--) {
				put(headerNode.childNodes[i], '!');
			}

			var row = this.createRowCells('th', function (th, column) {
				var contentNode = column.headerNode = th;
				var field = column.field;
				if (field) {
					th.field = field;
				}
				// allow for custom header content manipulation
				if (column.renderHeaderCell) {
					appendIfNode(contentNode, column.renderHeaderCell(contentNode));
				}
				else if ('label' in column || column.field) {
					contentNode.appendChild(document.createTextNode(
						'label' in column ? column.label : column.field));
				}
				if (column.sortable !== false && field && field !== '_item') {
					th.sortable = true;
					th.className += ' dgrid-sortable';
				}
			}, this.subRows && this.subRows.headerRows);
			this._rowIdToObject[row.id = this.id + '-header'] = this.columns;
			headerNode.appendChild(row);

			// If the columns are sortable, re-sort on clicks.
			// Use a separate listener property to be managed by renderHeader in case
			// of subsequent calls.
			if (this._sortListener) {
				this._sortListener.remove();
			}
			this._sortListener = listen(row, 'click,keydown', function (event) {
				// respond to click, space keypress, or enter keypress
				if (event.type === 'click' || event.keyCode === 32 ||
						(!has('opera') && event.keyCode === 13)) {
					var target = event.target,
						field, sort, newSort, eventObj;
					do {
						if (target.sortable) {
							// If the click is on the same column as the active sort,
							// reverse sort direction
							newSort = [{
								property: (field = target.field || target.columnId),
								descending: (sort = grid.sort[0]) && sort.property === field &&
									!sort.descending
							}];

							// Emit an event with the new sort
							eventObj = {
								bubbles: true,
								cancelable: true,
								grid: grid,
								parentType: event.type,
								sort: newSort
							};

							if (listen.emit(event.target, 'dgrid-sort', eventObj)) {
								// Stash node subject to DOM manipulations,
								// to be referenced then removed by sort()
								grid._sortNode = target;
								grid.set('sort', newSort);
							}

							break;
						}
					} while ((target = target.parentNode) && target !== headerNode);
				}
			});
		},

		resize: function () {
			// extension of List.resize to allow accounting for
			// column sizes larger than actual grid area
			var headerTableNode = this.headerNode.firstChild,
				contentNode = this.contentNode,
				width;

			this.inherited(arguments);

			// Force contentNode width to match up with header width.
			contentNode.style.width = ''; // reset first
			if (contentNode && headerTableNode) {
				if ((width = headerTableNode.offsetWidth) > contentNode.offsetWidth) {
					// update size of content node if necessary (to match size of rows)
					// (if headerTableNode can't be found, there isn't much we can do)
					contentNode.style.width = width + 'px';
				}
			}
		},

		destroy: function () {
			// Run _destroyColumns first to perform any column plugin tear-down logic.
			this._destroyColumns();
			if (this._sortListener) {
				this._sortListener.remove();
			}

			this.inherited(arguments);
		},

		_setSort: function () {
			// summary:
			//		Extension of List.js sort to update sort arrow in UI

			// Normalize sort first via inherited logic, then update the sort arrow
			this.inherited(arguments);
			this.updateSortArrow(this.sort);
		},

		_findSortArrowParent: function (field) {
			// summary:
			//		Method responsible for finding cell that sort arrow should be
			//		added under.  Called by updateSortArrow; separated for extensibility.

			var columns = this.columns;
			for (var i in columns) {
				var column = columns[i];
				if (column.field === field) {
					return column.headerNode;
				}
			}
		},

		updateSortArrow: function (sort, updateSort) {
			// summary:
			//		Method responsible for updating the placement of the arrow in the
			//		appropriate header cell.  Typically this should not be called (call
			//		set("sort", ...) when actually updating sort programmatically), but
			//		this method may be used by code which is customizing sort (e.g.
			//		by reacting to the dgrid-sort event, canceling it, then
			//		performing logic and calling this manually).
			// sort: Array
			//		Standard sort parameter - array of object(s) containing property name
			//		and optional descending flag
			// updateSort: Boolean?
			//		If true, will update this.sort based on the passed sort array
			//		(i.e. to keep it in sync when custom logic is otherwise preventing
			//		it from being updated); defaults to false

			// Clean up UI from any previous sort
			if (this._lastSortedArrow) {
				// Remove the sort classes from the parent node
				put(this._lastSortedArrow, '<!dgrid-sort-up!dgrid-sort-down');
				// Destroy the lastSortedArrow node
				put(this._lastSortedArrow, '!');
				delete this._lastSortedArrow;
			}

			if (updateSort) {
				this.sort = sort;
			}
			if (!sort[0]) {
				return; // Nothing to do if no sort is specified
			}

			var prop = sort[0].property,
				desc = sort[0].descending,
				// if invoked from header click, target is stashed in _sortNode
				target = this._sortNode || this._findSortArrowParent(prop),
				arrowNode;

			delete this._sortNode;

			// Skip this logic if field being sorted isn't actually displayed
			if (target) {
				target = target.contents || target;
				// Place sort arrow under clicked node, and add up/down sort class
				arrowNode = this._lastSortedArrow = put('div.dgrid-sort-arrow.ui-icon[role=presentation]');
				arrowNode.innerHTML = '&nbsp;';
				target.insertBefore(arrowNode, target.firstChild);
				put(target, desc ? '.dgrid-sort-down' : '.dgrid-sort-up');
				// Call resize in case relocation of sort arrow caused any height changes
				this.resize();
			}
		},

		styleColumn: function (colId, css) {
			// summary:
			//		Dynamically creates a stylesheet rule to alter a column's style.

			return this.addCssRule('#' + miscUtil.escapeCssIdentifier(this.domNode.id) +
				' .dgrid-column-' + replaceInvalidChars(colId), css);
		},

		/*=====
		_configColumn: function (column, rowColumns, prefix) {
			// summary:
			//		Method called when normalizing base configuration of a single
			//		column.  Can be used as an extension point for behavior requiring
			//		access to columns when a new configuration is applied.
		},=====*/

		_configColumns: function (prefix, rowColumns) {
			// configure the current column
			var subRow = [],
				isArray = rowColumns instanceof Array;

			function configColumn(column, columnId) {
				if (typeof column === 'string') {
					rowColumns[columnId] = column = { label: column };
				}
				if (!isArray && !column.field) {
					column.field = columnId;
				}
				columnId = column.id = column.id || (isNaN(columnId) ? columnId : (prefix + columnId));
				// allow further base configuration in subclasses
				if (this._configColumn) {
					this._configColumn(column, rowColumns, prefix);
					// Allow the subclasses to modify the column id.
					columnId = column.id;
				}
				if (isArray) {
					this.columns[columnId] = column;
				}

				// add grid reference to each column object for potential use by plugins
				column.grid = this;
				if (typeof column.init === 'function') {
					kernel.deprecated('colum.init',
						'Column plugins are being phased out in favor of mixins for better extensibility. ' +
							'column.init may be removed in a future release.');
					column.init();
				}

				subRow.push(column); // make sure it can be iterated on
			}

			miscUtil.each(rowColumns, configColumn, this);
			return isArray ? rowColumns : subRow;
		},

		_destroyColumns: function () {
			// summary:
			//		Iterates existing subRows looking for any column definitions with
			//		destroy methods (defined by plugins) and calls them.  This is called
			//		immediately before configuring a new column structure.

			var subRows = this.subRows,
				// If we have column sets, then we don't need to do anything with the missing subRows,
				// ColumnSet will handle it
				subRowsLength = subRows && subRows.length,
				i, j, column, len;

			// First remove rows (since they'll be refreshed after we're done),
			// so that anything aspected onto removeRow by plugins can run.
			// (cleanup will end up running again, but with nothing to iterate.)
			this.cleanup();

			for (i = 0; i < subRowsLength; i++) {
				for (j = 0, len = subRows[i].length; j < len; j++) {
					column = subRows[i][j];
					if (typeof column.destroy === 'function') {
						kernel.deprecated('colum.destroy',
							'Column plugins are being phased out in favor of mixins for better extensibility. ' +
								'column.destroy may be removed in a future release.');
						column.destroy();
					}
				}
			}
		},

		configStructure: function () {
			// configure the columns and subRows
			var subRows = this.subRows,
				columns = this._columns = this.columns;

			// Reset this.columns unless it was already passed in as an object
			this.columns = !columns || columns instanceof Array ? {} : columns;

			if (subRows) {
				// Process subrows, which will in turn populate the this.columns object
				for (var i = 0; i < subRows.length; i++) {
					subRows[i] = this._configColumns(i + '-', subRows[i]);
				}
			}
			else {
				this.subRows = [this._configColumns('', columns)];
			}
		},

		_getColumns: function () {
			// _columns preserves what was passed to set("columns"), but if subRows
			// was set instead, columns contains the "object-ified" version, which
			// was always accessible in the past, so maintain that accessibility going
			// forward.
			return this._columns || this.columns;
		},
		_setColumns: function (columns) {
			this._destroyColumns();
			// reset instance variables
			this.subRows = null;
			this.columns = columns;
			// re-run logic
			this._updateColumns();
		},

		_setSubRows: function (subrows) {
			this._destroyColumns();
			this.subRows = subrows;
			this._updateColumns();
		},

		_updateColumns: function () {
			// summary:
			//		Called when columns, subRows, or columnSets are reset

			this.configStructure();
			this.renderHeader();

			this.refresh();
			// re-render last collection if present
			this._lastCollection && this.renderArray(this._lastCollection);

			// After re-rendering the header, re-apply the sort arrow if needed.
			if (this._started) {
				if (this.sort.length) {
					this.updateSortArrow(this.sort);
				} else {
					// Only call resize directly if we didn't call updateSortArrow,
					// since that calls resize itself when it updates.
					this.resize();
				}
			}
		}
	});

	Grid.appendIfNode = appendIfNode;

	return Grid;
});

define('dgrid-0.4/Keyboard',[
	'dojo/_base/declare',
	'dojo/aspect',
	'dojo/on',
	'dojo/_base/lang',
	'dojo/has',
	'put-selector/put',
	'./util/misc',
	'dojo/_base/sniff'
], function (declare, aspect, on, lang, has, put, miscUtil) {

	var delegatingInputTypes = {
			checkbox: 1,
			radio: 1,
			button: 1
		},
		hasGridCellClass = /\bdgrid-cell\b/,
		hasGridRowClass = /\bdgrid-row\b/;

	var Keyboard = declare(null, {
		// summary:
		//		Adds keyboard navigation capability to a list or grid.

		// pageSkip: Number
		//		Number of rows to jump by when page up or page down is pressed.
		pageSkip: 10,

		tabIndex: 0,

		// keyMap: Object
		//		Hash which maps key codes to functions to be executed (in the context
		//		of the instance) for key events within the grid's body.
		keyMap: null,

		// headerKeyMap: Object
		//		Hash which maps key codes to functions to be executed (in the context
		//		of the instance) for key events within the grid's header row.
		headerKeyMap: null,

		postMixInProperties: function () {
			this.inherited(arguments);

			if (!this.keyMap) {
				this.keyMap = lang.mixin({}, Keyboard.defaultKeyMap);
			}
			if (!this.headerKeyMap) {
				this.headerKeyMap = lang.mixin({}, Keyboard.defaultHeaderKeyMap);
			}
		},

		postCreate: function () {
			this.inherited(arguments);
			var grid = this;

			function handledEvent(event) {
				// Text boxes and other inputs that can use direction keys should be ignored
				// and not affect cell/row navigation
				var target = event.target;
				return target.type && (!delegatingInputTypes[target.type] || event.keyCode === 32);
			}

			function enableNavigation(areaNode) {
				var cellNavigation = grid.cellNavigation,
					isFocusableClass = cellNavigation ? hasGridCellClass : hasGridRowClass,
					isHeader = areaNode === grid.headerNode,
					initialNode = areaNode;

				function initHeader() {
					if (grid._focusedHeaderNode) {
						// Remove the tab index for the node that previously had it.
						grid._focusedHeaderNode.tabIndex = -1;
					}
					if (grid.showHeader) {
						if (cellNavigation) {
							// Get the focused element. Ensure that the focused element
							// is actually a grid cell, not a column-set-cell or some
							// other cell that should not be focused
							var elements = grid.headerNode.getElementsByTagName('th');
							for (var i = 0, element; (element = elements[i]); ++i) {
								if (isFocusableClass.test(element.className)) {
									grid._focusedHeaderNode = initialNode = element;
									break;
								}
							}
						}
						else {
							grid._focusedHeaderNode = initialNode = grid.headerNode;
						}

						// Set the tab index only if the header is visible.
						if (initialNode) {
							initialNode.tabIndex = grid.tabIndex;
						}
					}
				}

				function afterContentAdded() {
					// Ensures the first element of a grid is always keyboard selectable after data has been
					// retrieved if there is not already a valid focused element.

					var focusedNode = grid._focusedNode || initialNode;

					// do not update the focused element if we already have a valid one
					if (isFocusableClass.test(focusedNode.className) && areaNode.contains(focusedNode)) {
						return;
					}

					// ensure that the focused element is actually a grid cell, not a
					// dgrid-preload or dgrid-content element, which should not be focusable,
					// even when data is loaded asynchronously
					var elements = areaNode.getElementsByTagName('*');
					for (var i = 0, element; (element = elements[i]); ++i) {
						if (isFocusableClass.test(element.className)) {
							focusedNode = grid._focusedNode = element;
							break;
						}
					}

					initialNode.tabIndex = -1;
					focusedNode.tabIndex = grid.tabIndex; // This is initialNode if nothing focusable was found
					return;
				}

				if (isHeader) {
					// Initialize header now (since it's already been rendered),
					// and aspect after future renderHeader calls to reset focus.
					initHeader();
					aspect.after(grid, 'renderHeader', initHeader, true);
				}
				else {
					aspect.after(grid, 'renderArray', afterContentAdded, true);
					aspect.after(grid, '_onNotification', function (rows, event) {
						if (event.totalLength === 0) {
							areaNode.tabIndex = 0;
						}
						else if (event.totalLength === 1 && event.type === 'add') {
							afterContentAdded();
						}
					}, true);
				}

				grid._listeners.push(on(areaNode, 'mousedown', function (event) {
					if (!handledEvent(event)) {
						grid._focusOnNode(event.target, isHeader, event);
					}
				}));

				grid._listeners.push(on(areaNode, 'keydown', function (event) {
					// For now, don't squash browser-specific functionalities by letting
					// ALT and META function as they would natively
					if (event.metaKey || event.altKey) {
						return;
					}

					var handler = grid[isHeader ? 'headerKeyMap' : 'keyMap'][event.keyCode];

					// Text boxes and other inputs that can use direction keys should be ignored
					// and not affect cell/row navigation
					if (handler && !handledEvent(event)) {
						handler.call(grid, event);
					}
				}));
			}

			if (this.tabableHeader) {
				enableNavigation(this.headerNode);
				on(this.headerNode, 'dgrid-cellfocusin', function () {
					grid.scrollTo({ x: this.scrollLeft });
				});
			}
			enableNavigation(this.contentNode);

			this._debouncedEnsureScroll = miscUtil.debounce(this._ensureScroll, this);
		},

		removeRow: function (rowElement) {
			if (!this._focusedNode) {
				// Nothing special to do if we have no record of anything focused
				return this.inherited(arguments);
			}

			var self = this,
				isActive = document.activeElement === this._focusedNode,
				focusedTarget = this[this.cellNavigation ? 'cell' : 'row'](this._focusedNode),
				focusedRow = focusedTarget.row || focusedTarget,
				sibling;
			rowElement = rowElement.element || rowElement;

			// If removed row previously had focus, temporarily store information
			// to be handled in an immediately-following insertRow call, or next turn
			if (rowElement === focusedRow.element) {
				sibling = this.down(focusedRow, true);

				// Check whether down call returned the same row, or failed to return
				// any (e.g. during a partial unrendering)
				if (!sibling || sibling.element === rowElement) {
					sibling = this.up(focusedRow, true);
				}

				this._removedFocus = {
					active: isActive,
					rowId: focusedRow.id,
					columnId: focusedTarget.column && focusedTarget.column.id,
					siblingId: !sibling || sibling.element === rowElement ? undefined : sibling.id
				};

				// Call _restoreFocus on next turn, to restore focus to sibling
				// if no replacement row was immediately inserted.
				// Pass original row's id in case it was re-inserted in a renderArray
				// call (and thus was found, but couldn't be focused immediately)
				setTimeout(function () {
					if (self._removedFocus) {
						self._restoreFocus(focusedRow.id);
					}
				}, 0);

				// Clear _focusedNode until _restoreFocus is called, to avoid
				// needlessly re-running this logic
				this._focusedNode = null;
			}

			this.inherited(arguments);
		},

		insertRow: function () {
			var rowElement = this.inherited(arguments);
			if (this._removedFocus && !this._removedFocus.wait) {
				this._restoreFocus(rowElement);
			}
			return rowElement;
		},

		_restoreFocus: function (row) {
			// summary:
			//		Restores focus to the newly inserted row if it matches the
			//		previously removed row, or to the nearest sibling otherwise.

			var focusInfo = this._removedFocus,
				newTarget,
				cell;

			row = row && this.row(row);
			newTarget = row && row.element && row.id === focusInfo.rowId ? row :
				typeof focusInfo.siblingId !== 'undefined' && this.row(focusInfo.siblingId);

			if (newTarget && newTarget.element) {
				if (!newTarget.element.parentNode.parentNode) {
					// This was called from renderArray, so the row hasn't
					// actually been placed in the DOM yet; handle it on the next
					// turn (called from removeRow).
					focusInfo.wait = true;
					return;
				}
				// Should focus be on a cell?
				if (typeof focusInfo.columnId !== 'undefined') {
					cell = this.cell(newTarget, focusInfo.columnId);
					if (cell && cell.element) {
						newTarget = cell;
					}
				}
				if (focusInfo.active && newTarget.element.offsetHeight !== 0) {
					// Row/cell was previously focused and is visible, so focus the new one immediately
					this._focusOnNode(newTarget, false, null);
				}
				else {
					// Row/cell was not focused or is not visible, but we still need to
					// update _focusedNode and the element's tabIndex/class
					put(newTarget.element, '.dgrid-focus');
					newTarget.element.tabIndex = this.tabIndex;
					this._focusedNode = newTarget.element;
				}
			}

			delete this._removedFocus;
		},

		addKeyHandler: function (key, callback, isHeader) {
			// summary:
			//		Adds a handler to the keyMap on the instance.
			//		Supports binding additional handlers to already-mapped keys.
			// key: Number
			//		Key code representing the key to be handled.
			// callback: Function
			//		Callback to be executed (in instance context) when the key is pressed.
			// isHeader: Boolean
			//		Whether the handler is to be added for the grid body (false, default)
			//		or the header (true).

			// Aspects may be about 10% slower than using an array-based appraoch,
			// but there is significantly less code involved (here and above).
			return aspect.after( // Handle
				this[isHeader ? 'headerKeyMap' : 'keyMap'], key, callback, true);
		},

		_ensureRowScroll: function (rowElement) {
			// summary:
			//		Ensures that the entire row is visible within the viewport.
			//		Called for cell navigation in complex structures.

			var scrollY = this.getScrollPosition().y;
			if (scrollY > rowElement.offsetTop) {
				// Row starts above the viewport
				this.scrollTo({ y: rowElement.offsetTop });
			}
			else if (scrollY + this.contentNode.offsetHeight < rowElement.offsetTop + rowElement.offsetHeight) {
				// Row ends below the viewport
				this.scrollTo({ y: rowElement.offsetTop - this.contentNode.offsetHeight + rowElement.offsetHeight });
			}
		},

		_ensureColumnScroll: function (cellElement) {
			// summary:
			//		Ensures that the entire cell is visible in the viewport.
			//		Called in cases where the grid can scroll horizontally.

			var scrollX = this.getScrollPosition().x;
			var cellLeft = cellElement.offsetLeft;
			if (scrollX > cellLeft) {
				this.scrollTo({ x: cellLeft });
			}
			else {
				var bodyWidth = this.bodyNode.clientWidth;
				var cellWidth = cellElement.offsetWidth;
				var cellRight = cellLeft + cellWidth;
				if (scrollX + bodyWidth < cellRight) {
					// Adjust so that the right side of the cell and grid body align,
					// unless the cell is actually wider than the body - then align the left sides
					this.scrollTo({ x: bodyWidth > cellWidth ? cellRight - bodyWidth : cellLeft });
				}
			}
		},

		_ensureScroll: function (cell, isHeader) {
			// summary:
			//		Corrects scroll based on the position of the newly-focused row/cell
			//		as necessary based on grid configuration and dimensions.

			if(this.cellNavigation && (this.columnSets || this.subRows.length > 1) && !isHeader){
				this._ensureRowScroll(cell.row.element);
			}
			if(this.bodyNode.clientWidth < this.contentNode.offsetWidth){
				this._ensureColumnScroll(cell.element);
			}
		},

		_focusOnNode: function (element, isHeader, event) {
			var focusedNodeProperty = '_focused' + (isHeader ? 'Header' : '') + 'Node',
				focusedNode = this[focusedNodeProperty],
				cellOrRowType = this.cellNavigation ? 'cell' : 'row',
				cell = this[cellOrRowType](element),
				inputs,
				input,
				numInputs,
				inputFocused,
				i;

			element = cell && cell.element;
			if (!element) {
				return;
			}

			if (this.cellNavigation) {
				inputs = element.getElementsByTagName('input');
				for (i = 0, numInputs = inputs.length; i < numInputs; i++) {
					input = inputs[i];
					if ((input.tabIndex !== -1 || '_dgridLastValue' in input) && !input.disabled) {
						input.focus();
						inputFocused = true;
						break;
					}
				}
			}

			// Set up event information for dgrid-cellfocusout/in events.
			// Note that these events are not fired for _restoreFocus.
			if (event !== null) {
				event = lang.mixin({ grid: this }, event);
				if (event.type) {
					event.parentType = event.type;
				}
				if (!event.bubbles) {
					// IE doesn't always have a bubbles property already true.
					// Opera throws if you try to set it to true if it is already true.
					event.bubbles = true;
				}
			}

			if (focusedNode) {
				// Clean up previously-focused element
				// Remove the class name and the tabIndex attribute
				put(focusedNode, '!dgrid-focus[!tabIndex]');

				// Expose object representing focused cell or row losing focus, via
				// event.cell or event.row; which is set depends on cellNavigation.
				if (event) {
					event[cellOrRowType] = this[cellOrRowType](focusedNode);
					on.emit(focusedNode, 'dgrid-cellfocusout', event);
				}
			}
			focusedNode = this[focusedNodeProperty] = element;

			if (event) {
				// Expose object representing focused cell or row gaining focus, via
				// event.cell or event.row; which is set depends on cellNavigation.
				// Note that yes, the same event object is being reused; on.emit
				// performs a shallow copy of properties into a new event object.
				event[cellOrRowType] = cell;
			}

			var isFocusableClass = this.cellNavigation ? hasGridCellClass : hasGridRowClass;
			if (!inputFocused && isFocusableClass.test(element.className)) {
				element.tabIndex = this.tabIndex;
				element.focus();
			}
			put(element, '.dgrid-focus');

			if (event) {
				on.emit(focusedNode, 'dgrid-cellfocusin', event);
			}

			this._debouncedEnsureScroll(cell, isHeader);
		},

		focusHeader: function (element) {
			this._focusOnNode(element || this._focusedHeaderNode, true);
		},

		focus: function (element) {
			var node = element || this._focusedNode;
			if (node) {
				this._focusOnNode(node, false);
			}
			else {
				if (this._removedFocus) {
					this._removedFocus.active = true;
				}
				this.contentNode.focus();
			}
		}
	});

	// Common functions used in default keyMap (called in instance context)

	var moveFocusVertical = Keyboard.moveFocusVertical = function (event, steps) {
		var cellNavigation = this.cellNavigation,
			target = this[cellNavigation ? 'cell' : 'row'](event),
			columnId = cellNavigation && target.column.id,
			next = this.down(this._focusedNode, steps, true);

		// Navigate within same column if cell navigation is enabled
		if (cellNavigation) {
			next = this.cell(next, columnId);
		}
		this._focusOnNode(next, false, event);

		event.preventDefault();
	};

	var moveFocusUp = Keyboard.moveFocusUp = function (event) {
		moveFocusVertical.call(this, event, -1);
	};

	var moveFocusDown = Keyboard.moveFocusDown = function (event) {
		moveFocusVertical.call(this, event, 1);
	};

	var moveFocusPageUp = Keyboard.moveFocusPageUp = function (event) {
		moveFocusVertical.call(this, event, -this.pageSkip);
	};

	var moveFocusPageDown = Keyboard.moveFocusPageDown = function (event) {
		moveFocusVertical.call(this, event, this.pageSkip);
	};

	var moveFocusHorizontal = Keyboard.moveFocusHorizontal = function (event, steps) {
		if (!this.cellNavigation) {
			return;
		}
		var isHeader = !this.row(event), // header reports row as undefined
			currentNode = this['_focused' + (isHeader ? 'Header' : '') + 'Node'];

		this._focusOnNode(this.right(currentNode, steps), isHeader, event);
		event.preventDefault();
	};

	var moveFocusLeft = Keyboard.moveFocusLeft = function (event) {
		moveFocusHorizontal.call(this, event, -1);
	};

	var moveFocusRight = Keyboard.moveFocusRight = function (event) {
		moveFocusHorizontal.call(this, event, 1);
	};

	var moveHeaderFocusEnd = Keyboard.moveHeaderFocusEnd = function (event, scrollToBeginning) {
		// Header case is always simple, since all rows/cells are present
		var nodes;
		if (this.cellNavigation) {
			nodes = this.headerNode.getElementsByTagName('th');
			this._focusOnNode(nodes[scrollToBeginning ? 0 : nodes.length - 1], true, event);
		}
		// In row-navigation mode, there's nothing to do - only one row in header

		// Prevent browser from scrolling entire page
		event.preventDefault();
	};

	var moveHeaderFocusHome = Keyboard.moveHeaderFocusHome = function (event) {
		moveHeaderFocusEnd.call(this, event, true);
	};

	var moveFocusEnd = Keyboard.moveFocusEnd = function (event, scrollToTop) {
		// summary:
		//		Handles requests to scroll to the beginning or end of the grid.

		var cellNavigation = this.cellNavigation,
			contentNode = this.contentNode,
			contentPos = scrollToTop ? 0 : contentNode.scrollHeight,
			scrollPos = contentNode.scrollTop + contentPos,
			endChild = contentNode[scrollToTop ? 'firstChild' : 'lastChild'],
			hasPreload = endChild.className.indexOf('dgrid-preload') > -1,
			endTarget = hasPreload ? endChild[(scrollToTop ? 'next' : 'previous') + 'Sibling'] : endChild,
			handle;

		// Scroll explicitly rather than relying on native browser scrolling
		// (which might use smooth scrolling, which could incur extra renders for OnDemandList)
		event.preventDefault();
		this.scrollTo({
			y: scrollPos
		});

		if (hasPreload) {
			// Find the nearest dgrid-row to the relevant end of the grid
			while (endTarget && endTarget.className.indexOf('dgrid-row') < 0) {
				endTarget = endTarget[(scrollToTop ? 'next' : 'previous') + 'Sibling'];
			}
			// If none is found, there are no rows, and nothing to navigate
			if (!endTarget) {
				return;
			}
		}

		// Grid content may be lazy-loaded, so check if content needs to be
		// loaded first
		if (!hasPreload || endChild.offsetHeight < 1) {
			// End row is loaded; focus the first/last row/cell now
			if (cellNavigation) {
				// Preserve column that was currently focused
				endTarget = this.cell(endTarget, this.cell(event).column.id);
			}
			this._focusOnNode(endTarget, false, event);
		}
		else {
			// In IE < 9, the event member references will become invalid by the time
			// _focusOnNode is called, so make a (shallow) copy up-front
			if (!has('dom-addeventlistener')) {
				event = lang.mixin({}, event);
			}

			// If the topmost/bottommost row rendered doesn't reach the top/bottom of
			// the contentNode, we are using OnDemandList and need to wait for more
			// data to render, then focus the first/last row in the new content.
			handle = aspect.after(this, 'renderArray', function (rows) {
				var target = rows[scrollToTop ? 0 : rows.length - 1];
				if (cellNavigation) {
					// Preserve column that was currently focused
					target = this.cell(target, this.cell(event).column.id);
				}
				this._focusOnNode(target, false, event);
				handle.remove();
				return rows;
			});
		}
	};

	var moveFocusHome = Keyboard.moveFocusHome = function (event) {
		moveFocusEnd.call(this, event, true);
	};

	function preventDefault(event) {
		event.preventDefault();
	}

	Keyboard.defaultKeyMap = {
		32: preventDefault, // space
		33: moveFocusPageUp, // page up
		34: moveFocusPageDown, // page down
		35: moveFocusEnd, // end
		36: moveFocusHome, // home
		37: moveFocusLeft, // left
		38: moveFocusUp, // up
		39: moveFocusRight, // right
		40: moveFocusDown // down
	};

	// Header needs fewer default bindings (no vertical), so bind it separately
	Keyboard.defaultHeaderKeyMap = {
		32: preventDefault, // space
		35: moveHeaderFocusEnd, // end
		36: moveHeaderFocusHome, // home
		37: moveFocusLeft, // left
		39: moveFocusRight // right
	};

	return Keyboard;
});

/**
 * @module
 * @class ColumnLocking
 * ColumnLocking allows for columns to be "locked", preventing horizontal scrolling
 * and locking columns to always be visible on the left side of the grid.
 * This module facilitates this functionality by manipulating the column structure of
 * the grid instance to include a columnSet based on the _lockedColumns property
 *
 * This module is automatically mixed into the dgrid instance created in TableBase.factory
 */
define('hui/table/ColumnLocking',[
    'dojo/_base/declare',
    'dojo/aspect',
    'dojo/on',
    'dojo/has',
    '../core/deviceUtils'
], function(declare, aspect, on, has, deviceUtils) {
    has.add('event-mousewheel', function(global, document, element) {
        return 'onmousewheel' in element;
    });
    has.add('event-wheel', function(global, document, element) {
        return 'onwheel' in element;
    });

    var colsetidAttr = 'data-dgrid-column-set-id';

    function findParentColumnSet(node, root) {
        if (node.nodeType !== 1) {
            node = node.parentNode;
        }

        /*istanbul ignore next*/
        while (node && !node[node.matches ? 'matches' : 'msMatchesSelector']('.dgrid-column-set[' + colsetidAttr + ']')) {
            node = node.parentNode;
            if (node === root) {
                return null;
            }
        }

        return node;
    }

    /* istanbul ignore next */
    function getTouchEventName(type) {
        var hasPointer = has('pointer'),
            pointerMap = { start: 'down', end: 'up' };

        if (hasPointer) {
            type = pointerMap[type] || type;
            if (hasPointer.slice(0, 2) === 'MS') {
                return 'MSPointer' + type.slice(0, 1).toUpperCase() + type.slice(1);
            } else {
                return 'pointer' + type;
            }
        }

        return 'touch' + type;
    }

    /* istanbul ignore next */
    function horizTouchMove(grid) {
        return function(target, listener) {
            var listeners = [
                on(target, getTouchEventName('start'), function(event) {
                    if (!grid._currentlyTouchedColumnSet) {
                        var node = findParentColumnSet(event.target, target);
                        if (node && (!event.pointerType || event.pointerType === 'touch' || event.pointerType === 2)) {
                            grid._currentlyTouchedColumnSet = node;
                            grid._lastColumnSetTouchX = event.clientX;
                            grid._lastColumnSetTouchY = event.clientY;
                        }
                    }
                }),
                on(target, getTouchEventName('move'), function(event) {
                    if (grid._currentlyTouchedColumnSet === null) {
                        return;
                    }

                    var node = findParentColumnSet(event.target);
                    if (!node) {
                        return;
                    }
                    listener.call(grid, node, grid._lastColumnSetTouchX - event.clientX);
                    grid._lastColumnSetTouchX = event.clientX;
                    grid._lastColumnSetTouchY = event.clientY;
                }),
                on(target, getTouchEventName('end'), function() {
                    grid._currentlyTouchedColumnSet = null;
                })
            ];

            return {
                remove: function() {
                    listeners.forEach(function(listener) {
                        listener.remove();
                    });
                }
            };
        };
    }

    /* istanbul ignore next */
    function horizMouseWheel(grid) {
        if (has('event-mousewheel') || has('event-wheel')) {
            return function(target, listener) {
                return on(target, has('event-wheel') ? 'wheel' : 'mousewheel', function(event) {
                    var node = findParentColumnSet(event.target, target),
                        deltaX;

                    if (!node) {
                        return;
                    }

                    deltaX = event.deltaX || -event.wheelDeltaX / 3;
                    if (deltaX) {
                        listener.call(grid, node, deltaX);
                    }
                });
            };
        }

        return function(target, listener) {
            return on(target, '.dgrid-column-set[' + colsetidAttr + ']:MozMousePixelScroll', function(event) {
                if (event.axis === 1) {
                    listener.call(grid, this, event.detail);
                }
            });
        };
    }

    return declare(null, {
        _columnSetListeners: null,
        columnSets: null,

        postMixInProperties: function() {
            this.inherited(arguments);
            this._columnSetListeners = [];
        },

        postCreate: function() {
            this.inherited(arguments);
            if (this.lockedColumns) {
                this._setupColumnSetListeners();
            }
        },

        /**
         * Add the column locking event listeners to the instance.
         * This will setup event listeners that will handle scrolling the records that
         * are scrollable
         */
        _setupColumnSetListeners: function() {
            var self = this,
                listeners = this._columnSetListeners;
            if (listeners.length) {
                this._removeColumnSetListeners();
            }
            listeners.push(this.on(horizMouseWheel(this), this._horizMoveHandler));
            if (has('touch')) {
                listeners.push(this.on(horizTouchMove(this), this._horizMoveHandler));
            }

            /* istanbul ignore next */
            listeners.push(this.on('.dgrid-column-set:dgrid-cellfocusin', function(event) {
                self._onColumnSetCellFocus(event, this);
            }));
        },

        /**
         * Remove the event listeners for the column sets when no columns are locked
         */
        _removeColumnSetListeners: function() {
            this._columnSetListeners.forEach(function(event) {
                event.remove();
            });
            this._columnSetListeners = [];
        },

        _horizMoveHandler: function(colsetNode, amount) {
            var id = colsetNode.getAttribute(colsetidAttr),
                scroller = this._columnSetScrollers[id],
                scrollLeft = scroller.scrollLeft + amount;

            scroller.scrollLeft = scrollLeft < 0 ? 0 : scrollLeft;
        },

        /**
         * Adjust the horizontal scroll of the grid when data is refreshed
         * @override
         */
        renderArray: function() {
            var rows = this.inherited(arguments);

            rows.forEach(function(row) {
                this._adjustScrollLeft(row);
            }, this);

            return rows;
        },

        _adjustScrollLeft: function(row) {
            var scrollLefts = this._columnSetScrollLefts;
            Array.prototype.forEach.call(row.querySelectorAll('.dgrid-column-set'), function(element) {
                element.scrollLeft = scrollLefts[element.getAttribute(colsetidAttr)];
            });
        },

        /**
         * If columns are locked, wrap them in wrappers to control their scrolling independently
         * @override
         */
        createRowCells: function(tag, each, subRows, object) {
            if (!this.lockedColumns) {
                return this.inherited(arguments);
            }

            var row = document.createElement('table'),
                tbody = document.createElement('tbody'),
                tr = document.createElement('tr'),
                args = arguments,
                columnSets;

            row.classList.add('dgrid-row-table');
            row.setAttribute('role', 'presentation');
            row.appendChild(tbody);
            tbody.appendChild(tr);

            subRows = (subRows || this.subRows)[0];
            columnSets = this.columnSets = [
                [subRows.slice(0, this.lockedColumns)],
                [subRows.slice(this.lockedColumns)]
            ];

            columnSets.forEach(function(subset, i) {
                var el = document.createElement(tag),
                    cell = document.createElement('div');
                tr.appendChild(el);
                el.classList.add('dgrid-column-set-cell');
                el.classList.add('dgrid-column-set-' + i);
                el.appendChild(cell);
                cell.classList.add('dgrid-column-set');
                cell.setAttribute(colsetidAttr, i);
                cell.appendChild(this.inherited(args, [tag, each, subset, object]));
            }, this);
            return row;
        },

        /**
         * Setup the headers for the grid, allowing the position to be adjusted
         * if columns are locked
         * @override
         */
        renderHeader: function() {
            this.inherited(arguments);

            if (!this.lockedColumns) {
                return;
            }

            var columnSets = this.columnSets,
                scrollers = this._columnSetScrollers,
                grid = this,
                scrollerNode,
                i;

            function reposition() {
                grid._positionScrollers();
            }

            this._columnSetScrollerContents = {};
            this._columnSetScrollLefts = {};

            if (scrollers) {
                for (i in scrollers) {
                    scrollers[i].parentNode.removeChild(scrollers[i]);
                }
            } else {
                // aspect.after(this, 'resize', reposition, true);
                aspect.after(this, 'styleColumn', reposition, true);
                this._columnSetScrollerNode = scrollerNode = document.createElement('div');
                scrollerNode.classList.add('dgrid-column-set-scroller-container');
                this.footerNode.parentElement.insertBefore(scrollerNode, this.footerNode.nextSibling);
            }

            scrollers = this._columnSetScrollers = {};
            columnSets.forEach(this._putScroller.bind(this));
            this._positionScrollers();
        },

        /**
         * CAlled for each column set
         * @private
         */
        _putScroller: function(columnSet, i) {
            var scroller = this._columnSetScrollers[i] = document.createElement('span'),
                contentNode = document.createElement('div');
            scroller.classList.add('dgrid-column-set-scroller');
            scroller.classList.add('dgrid-column-set-scroller-' + i);
            scroller.setAttribute(colsetidAttr, i);
            this._columnSetScrollerNode.appendChild(scroller);
            contentNode.classList.add('dgrid-column-set-scroller-content');
            scroller.appendChild(contentNode);
            this._columnSetScrollerContents[i] = contentNode;
            on(scroller, 'scroll', this._onColumnSetScroll.bind(this));
        },

        /**
         * Compute a new scrollLeft based on actual resulting value
         * @param {Event} event - the event object
         */
        _onColumnSetScroll: function(event) {
            var scrollLeft = event.target.scrollLeft,
                colSetId = event.target.getAttribute(colsetidAttr),
                newScrollLeft;

            if (this._columnSetScrollLefts[colSetId] !== scrollLeft) {
                Array.prototype.forEach.call(this.domNode.querySelectorAll('.dgrid-column-set[' + colsetidAttr + '="' + colSetId + '"], .dgrid-column-set-scroller[' + colsetidAttr + '="' + colSetId + '"]'), function(element, i) {

                    if (deviceUtils.isHandheld()) {
                        element.style.transform = 'translate3d(-' + scrollLeft + 'px, 0, 0)';
                    } else {
                        element.scrollLeft = scrollLeft;
                    }

                    if (!i) {
                        newScrollLeft = scrollLeft;
                    }
                });
                this._columnSetScrollLefts[colSetId] = newScrollLeft;
            }
        },

        /**
         * position the scrollers, keeping them in sync
         */
        _positionScrollers: function() {
            var domNode = this.domNode,
                scrollers = this._columnSetScrollers,
                scrollerContents = this._columnSetScrollerContents,
                columnSets = this.columnSets,
                scrollerWidth = 0,
                numScrollers = 0, // tracks number of visible scrollers (sets w/ overflow)
                columnSetElement, contentWidth;

            columnSets.forEach(function(subset, i) {
                // iterate through the columnSets

                columnSetElement = domNode.querySelector('.dgrid-column-set[' + colsetidAttr + '="' + i + '"]');
                scrollerWidth = columnSetElement.offsetWidth;
                contentWidth = columnSetElement.firstChild.offsetWidth;
                scrollerContents[i].style.width = contentWidth + 'px';
                scrollers[i].style.width = scrollerWidth + 'px';

                // Keep track of how many scrollbars we're showing
                if (contentWidth > scrollerWidth) {
                    numScrollers++;
                }
            });

            this._columnSetScrollerNode.style.bottom = this.showFooter ? this.footerNode.offsetHeight + 'px' : '0';

            // Align bottom of body node depending on whether there are scrollbars
            this.bodyNode.style.bottom = numScrollers ?
                (has('dom-scrollbar-height') + (has('ie') ? 1 : 0) + 'px') :
                '0';
        },

        /**
         * Callback for setting cell focus on a column. This will scroll the cell into view if it is partially off
         */
        _onColumnSetCellFocus: function(event, columnSetNode) {
            var focusedNode = event.target,
                columnSetId = columnSetNode.getAttribute(colsetidAttr),
                columnScroller = this._columnSetScrollers[columnSetId],
                elementEdge = focusedNode.offsetLeft - columnScroller.scrollLeft + focusedNode.offsetWidth;

            /**
             * This code branch will never get hit unless the test is mocked to the point of being overly brittle
             * and would be better served with a functional test.
             */
            /* istanbul ignore if */
            if (elementEdge > columnSetNode.offsetWidth || columnScroller.scrollLeft > focusedNode.offsetLeft) {
                this._scrollColumnSetTo(columnSetNode, focusedNode.offsetLeft);
            }
        },

        _scrollColumnSetTo: function(columnSetNode, offsetLeft) {
            var id = columnSetNode.getAttribute(colsetidAttr),
                scroller = this._columnSetScrollers[id];

            scroller.scrollLeft = offsetLeft < 0 ? 0 : offsetLeft;
        },

        /**
         * Set and update the table rendering based on how many columns should be locked to the left side.
         */
        _setLockedColumns: function(lockedColumns) {
            if (lockedColumns < 0) {
                lockedColumns = 0;
            }

            this.columnSets = null;
            this._resetColumnSizes();
            this.lockedColumns = lockedColumns;
            this._updateColumns();
            this[lockedColumns ? '_setupColumnSetListeners' : '_removeColumnSetListeners']();
        },

        /**
         * Remove the custom resize rules when restructuring the table
         * @private
         */
        _resetColumnSizes: function() {
            for (var name in this._columnSizes) {
                this._columnSizes[name].remove();
            }

            this._columnSizes = {};
        }
    });
});

define('dgrid-0.4/_StoreMixin',[
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/Deferred',
	'dojo/aspect',
	'dojo/has',
	'dojo/on',
	'dojo/when',
	'put-selector/put'
], function (declare, lang, Deferred, aspect, has, on, when, put) {
	// This module isolates the base logic required by store-aware list/grid
	// components, e.g. OnDemandList/Grid and the Pagination extension.

	function emitError(err) {
		// called by _trackError in context of list/grid, if an error is encountered
		if (typeof err !== 'object') {
			// Ensure we actually have an error object, so we can attach a reference.
			err = new Error(err);
		}
		else if (err.dojoType === 'cancel') {
			// Don't fire dgrid-error events for errors due to canceled requests
			// (unfortunately, the Deferred instrumentation will still log them)
			return;
		}

		var event = on.emit(this.domNode, 'dgrid-error', {
			grid: this,
			error: err,
			cancelable: true,
			bubbles: true
		});
		if (event) {
			console.error(err);
		}
	}

	return declare(null, {
		// collection: Object
		//		The base object collection (implementing the dstore/api/Store API) before being sorted
		//		or otherwise processed by the grid. Use it for general purpose store operations such as
		//		`getIdentity` and `get`, `add`, `put`, and `remove`.
		collection: null,

		// _renderedCollection: Object
		//		The object collection from which data is to be fetched. This is the sorted collection.
		//		Use it when retrieving data to be rendered by the grid.
		_renderedCollection: null,

		// _rows: Array
		//		Sparse array of row nodes, used to maintain the grid in response to events from a tracked collection.
		//		Each node's index corresponds to the index of its data object in the collection.
		_rows: null,

		// _observerHandle: Object
		//		The observer handle for the current collection, if trackable.
		_observerHandle: null,

		// shouldTrackCollection: Boolean
		//		Whether this instance should track any trackable collection it is passed.
		shouldTrackCollection: true,

		// getBeforePut: boolean
		//		If true, a get request will be performed to the store before each put
		//		as a baseline when saving; otherwise, existing row data will be used.
		getBeforePut: true,

		// noDataMessage: String
		//		Message to be displayed when no results exist for a collection, whether at
		//		the time of the initial query or upon subsequent observed changes.
		//		Defined by _StoreMixin, but to be implemented by subclasses.
		noDataMessage: '',

		// loadingMessage: String
		//		Message displayed when data is loading.
		//		Defined by _StoreMixin, but to be implemented by subclasses.
		loadingMessage: '',

		_total: 0,

		constructor: function () {
			// Create empty objects on each instance, not the prototype
			this.dirty = {};
			this._updating = {}; // Tracks rows that are mid-update
			this._columnsWithSet = {};

			// Reset _columnsWithSet whenever column configuration is reset
			aspect.before(this, 'configStructure', lang.hitch(this, function () {
				this._columnsWithSet = {};
			}));
		},

		destroy: function () {
			this.inherited(arguments);

			if (this._renderedCollection) {
				this._cleanupCollection();
			}
		},

		_configColumn: function (column) {
			// summary:
			//		Implements extension point provided by Grid to store references to
			//		any columns with `set` methods, for use during `save`.
			if (column.set) {
				this._columnsWithSet[column.field] = column;
			}
			this.inherited(arguments);
		},

		_setCollection: function (collection) {
			// summary:
			//		Assigns a new collection to the list/grid, sets up tracking
			//		if applicable, and tells the list/grid to refresh.

			if (this._renderedCollection) {
				this.cleanup();
				this._cleanupCollection({
					// Only clear the dirty hash if the collection being used is actually from a different store
					// (i.e. not just a re-sorted / re-filtered version of the same store)
					shouldRevert: !collection || collection.storage !== this._renderedCollection.storage
				});
			}

			this.collection = collection;

			// Avoid unnecessary rendering and processing before the grid has started up
			if (this._started) {
				// Once startup is called, List.startup sets the sort property which calls _StoreMixin._applySort
				// which sets the collection property again.  So _StoreMixin._applySort will be executed again
				// after startup is called.
				if (collection) {
					var renderedCollection = collection;
					if (this.sort && this.sort.length > 0) {
						renderedCollection = collection.sort(this.sort);
					}

					if (renderedCollection.track && this.shouldTrackCollection) {
						renderedCollection = renderedCollection.track();
						this._rows = [];

						this._observerHandle = this._observeCollection(
							renderedCollection,
							this.contentNode,
							{ rows: this._rows }
						);
					}

					this._renderedCollection = renderedCollection;
				}
				this.refresh();
			}
		},

		_setStore: function () {
			if (!this.collection) {
				console.debug('set(\'store\') call detected, but you probably meant set(\'collection\') for 0.4');
			}
		},

		_getTotal: function () {
			// summary:
			//		Retrieves the currently-tracked total (as updated by
			//		subclasses after store queries, or by _StoreMixin in response to
			//		updated totalLength in events)

			return this._total;
		},

		_cleanupCollection: function (options) {
			// summary:
			//		Handles cleanup duty for the previous collection;
			//		called during _setCollection and destroy.
			// options: Object?
			//		* shouldRevert: Whether to clear the dirty hash

			options = options || {};

			if (this._renderedCollection.tracking) {
				this._renderedCollection.tracking.remove();
			}

			// Remove observer and existing rows so any sub-row observers will be cleaned up
			if (this._observerHandle) {
				this._observerHandle.remove();
				this._observerHandle = this._rows = null;
			}

			// Discard dirty map, as it applied to a previous collection
			if (options.shouldRevert !== false) {
				this.dirty = {};
			}

			this._renderedCollection = this.collection = null;
		},

		_applySort: function () {
			if (this.collection) {
				this.set('collection', this.collection);
			}
			else if (this.store) {
				console.debug('_StoreMixin found store property but not collection; ' +
					'this is often the sign of a mistake during migration from 0.3 to 0.4');
			}
		},

		row: function () {
			// Extend List#row with more appropriate lookup-by-id logic
			var row = this.inherited(arguments);
			if (row && row.data && typeof row.id !== 'undefined') {
				row.id = this.collection.getIdentity(row.data);
			}
			return row;
		},

		refresh: function () {
			var result = this.inherited(arguments);

			if (!this.collection) {
				this.noDataNode = put(this.contentNode, 'div.dgrid-no-data');
				this.noDataNode.innerHTML = this.noDataMessage;
			}

			return result;
		},

		renderArray: function () {
			var rows = this.inherited(arguments);

			if (!this.collection) {
				if (rows.length && this.noDataNode) {
					put(this.noDataNode, '!');
				}
			}
			return rows;
		},

		insertRow: function (object, parent, beforeNode, i, options) {
			var store = this.collection,
				dirty = this.dirty,
				id = store && store.getIdentity(object),
				dirtyObj,
				row;

			if (id in dirty && !(id in this._updating)) {
				dirtyObj = dirty[id];
			}
			if (dirtyObj) {
				// restore dirty object as delegate on top of original object,
				// to provide protection for subsequent changes as well
				object = lang.delegate(object, dirtyObj);
			}

			row = this.inherited(arguments);

			if (options && options.rows) {
				options.rows[i] = row;
			}

			// Remove no data message when a new row appears.
			// Run after inherited logic to prevent confusion due to noDataNode
			// no longer being present as a sibling.
			if (this.noDataNode) {
				put(this.noDataNode, '!');
				this.noDataNode = null;
			}

			return row;
		},

		updateDirty: function (id, field, value) {
			// summary:
			//		Updates dirty data of a field for the item with the specified ID.
			var dirty = this.dirty,
				dirtyObj = dirty[id];

			if (!dirtyObj) {
				dirtyObj = dirty[id] = {};
			}
			dirtyObj[field] = value;
		},

		save: function () {
			// Keep track of the store and puts
			var self = this,
				store = this.collection,
				dirty = this.dirty,
				dfd = new Deferred(),
				results = {},
				getFunc = function (id) {
					// returns a function to pass as a step in the promise chain,
					// with the id variable closured
					var data;
					return (self.getBeforePut || !(data = self.row(id).data)) ?
						function () {
							return store.get(id);
						} :
						function () {
							return data;
						};
				};

			// function called within loop to generate a function for putting an item
			function putter(id, dirtyObj) {
				// Return a function handler
				return function (object) {
					var colsWithSet = self._columnsWithSet,
						updating = self._updating,
						key, data;

					if (typeof object.set === 'function') {
						object.set(dirtyObj);
					} else {
						// Copy dirty props to the original, applying setters if applicable
						for (key in dirtyObj) {
							object[key] = dirtyObj[key];
						}
					}

					// Apply any set methods in column definitions.
					// Note that while in the most common cases column.set is intended
					// to return transformed data for the key in question, it is also
					// possible to directly modify the object to be saved.
					for (key in colsWithSet) {
						data = colsWithSet[key].set(object);
						if (data !== undefined) {
							object[key] = data;
						}
					}

					updating[id] = true;
					// Put it in the store, returning the result/promise
					return store.put(object).then(function (result) {
						// Clear the item now that it's been confirmed updated
						delete dirty[id];
						delete updating[id];
						results[id] = result;
						return results;
					});
				};
			}

			var promise = dfd.then(function () {
				// Ensure empty object is returned even if nothing was dirty, for consistency
				return results;
			});

			// For every dirty item, grab the ID
			for (var id in dirty) {
				// Create put function to handle the saving of the the item
				var put = putter(id, dirty[id]);

				// Add this item onto the promise chain,
				// getting the item from the store first if desired.
				promise = promise.then(getFunc(id)).then(put);
			}

			// Kick off and return the promise representing all applicable get/put ops.
			// If the success callback is fired, all operations succeeded; otherwise,
			// save will stop at the first error it encounters.
			dfd.resolve();
			return promise;
		},

		revert: function () {
			// summary:
			//		Reverts any changes since the previous save.
			this.dirty = {};
			this.refresh();
		},

		_trackError: function (func) {
			// summary:
			//		Utility function to handle emitting of error events.
			// func: Function|String
			//		A function which performs some store operation, or a String identifying
			//		a function to be invoked (sans arguments) hitched against the instance.
			//		If sync, it can return a value, but may throw an error on failure.
			//		If async, it should return a promise, which would fire the error
			//		callback on failure.
			// tags:
			//		protected

			if (typeof func === 'string') {
				func = lang.hitch(this, func);
			}

			var self = this,
				promise;

			try {
				promise = when(func());
			} catch (err) {
				// report sync error
				var dfd = new Deferred();
				dfd.reject(err);
				promise = dfd.promise;
			}

			promise.otherwise(function (err) {
				emitError.call(self, err);
			});
			return promise;
		},

		removeRow: function (rowElement, preserveDom, options) {
			var row = {element: rowElement};
			// Check to see if we are now empty...
			if (!preserveDom && this.noDataMessage &&
					(this.up(row).element === rowElement) &&
					(this.down(row).element === rowElement)) {
				// ...we are empty, so show the no data message.
				this.noDataNode = put(this.contentNode, 'div.dgrid-no-data');
				this.noDataNode.innerHTML = this.noDataMessage;
			}

			var rows = (options && options.rows) || this._rows;
			if (rows) {
				delete rows[rowElement.rowIndex];
			}

			return this.inherited(arguments);
		},

		renderQueryResults: function (results, beforeNode, options) {
			// summary:
			//		Renders objects from QueryResults as rows, before the given node.

			options = lang.mixin({ rows: this._rows }, options);
			var self = this;

			if (!has('dojo-built')) {
				// Check for null/undefined totalResults to help diagnose faulty services/stores
				results.totalLength.then(function (total) {
					if (total == null) {
						console.warn('Store reported null or undefined totalLength. ' +
							'Make sure your store (and service, if applicable) are reporting total correctly!');
					}
				});
			}

			return results.then(function (resolvedResults) {
				var resolvedRows = self.renderArray(resolvedResults, beforeNode, options);
				delete self._lastCollection; // used only for non-store List/Grid
				return resolvedRows;
			});
		},

		_observeCollection: function (collection, container, options) {
			var self = this,
				rows = options.rows,
				row;

			var handles = [
				collection.on('delete, update', function (event) {
					var from = event.previousIndex;
					var to = event.index;

					if (from !== undefined && rows[from]) {
						if ('max' in rows && (to === undefined || to < rows.min || to > rows.max)) {
							rows.max--;
						}

						row = rows[from];

						// check to make the sure the node is still there before we try to remove it
						// (in case it was moved to a different place in the DOM)
						if (row.parentNode === container) {
							self.removeRow(row, false, options);
						}

						// remove the old slot
						rows.splice(from, 1);

						if (event.type === 'delete' ||
								(event.type === 'update' && (from < to || to === undefined))) {
							// adjust the rowIndex so adjustRowIndices has the right starting point
							rows[from] && rows[from].rowIndex--;
						}
					}
					if (event.type === 'delete') {
						// Reset row in case this is later followed by an add;
						// only update events should retain the row variable below
						row = null;
					}
				}),

				collection.on('add, update', function (event) {
					var from = event.previousIndex;
					var to = event.index;
					var nextNode;

					function advanceNext() {
						nextNode = (nextNode.connected || nextNode).nextSibling;
					}

					// When possible, restrict observations to the actually rendered range
					if (to !== undefined && (!('max' in rows) || (to >= rows.min && to <= rows.max))) {
						if ('max' in rows && (from === undefined || from < rows.min || from > rows.max)) {
							rows.max++;
						}
						// Add to new slot (either before an existing row, or at the end)
						// First determine the DOM node that this should be placed before.
						if (rows.length) {
							nextNode = rows[to];
							if (!nextNode) {
								nextNode = rows[to - 1];
								if (nextNode) {
									// Make sure to skip connected nodes, so we don't accidentally
									// insert a row in between a parent and its children.
									advanceNext();
								}
							}
						}
						else {
							// There are no rows.  Allow for subclasses to insert new rows somewhere other than
							// at the end of the parent node.
							nextNode = self._getFirstRowSibling && self._getFirstRowSibling(container);
						}
						// Make sure we don't trip over a stale reference to a
						// node that was removed, or try to place a node before
						// itself (due to overlapped queries)
						if (row && nextNode && row.id === nextNode.id) {
							advanceNext();
						}
						if (nextNode && !nextNode.parentNode) {
							nextNode = document.getElementById(nextNode.id);
						}
						rows.splice(to, 0, undefined);
						row = self.insertRow(event.target, container, nextNode, to, options);
						self.highlightRow(row);
					}
					// Reset row so it doesn't get reused on the next event
					row = null;
				}),

				collection.on('add, delete, update', function (event) {
					var from = (typeof event.previousIndex !== 'undefined') ? event.previousIndex : Infinity,
						to = (typeof event.index !== 'undefined') ? event.index : Infinity,
						adjustAtIndex = Math.min(from, to);
					from !== to && rows[adjustAtIndex] && self.adjustRowIndices(rows[adjustAtIndex]);

					// the removal of rows could cause us to need to page in more items
					if (from !== Infinity && self._processScroll && (rows[from] || rows[from - 1])) {
						self._processScroll();
					}

					// Fire _onNotification, even for out-of-viewport notifications,
					// since some things may still need to update (e.g. Pagination's status/navigation)
					self._onNotification(rows, event, collection);

					// Update _total after _onNotification so that it can potentially
					// decide whether to perform actions based on whether the total changed
					if (collection === self._renderedCollection && 'totalLength' in event) {
						self._total = event.totalLength;
					}
				})
			];

			return {
				remove: function () {
					while (handles.length > 0) {
						handles.pop().remove();
					}
				}
			};
		},

		_onNotification: function () {
			// summary:
			//		Protected method called whenever a store notification is observed.
			//		Intended to be extended as necessary by mixins/extensions.
			// rows: Array
			//		A sparse array of row nodes corresponding to data objects in the collection.
			// event: Object
			//		The notification event
			// collection: Object
			//		The collection that the notification is relevant to.
			//		Useful for distinguishing child-level from top-level notifications.
		}
	});
});



define('dgrid-0.4/extensions/Pagination',[
	'../_StoreMixin',
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/_base/lang',
	'dojo/on',
	'dojo/query',
	'dojo/string',
	'dojo/has',
	'dojo/when',
	'put-selector/put',
	'../util/misc',
	'dojo/i18n!./nls/pagination',
	'dojo/_base/sniff',
	'xstyle/css!../css/extensions/Pagination.css'
], function (_StoreMixin, declare, arrayUtil, lang, on, query, string, has, when, put, miscUtil, i18n) {
	function cleanupContent(grid) {
		// Remove any currently-rendered rows, or noDataMessage
		if (grid.noDataNode) {
			put(grid.noDataNode, '!');
			delete grid.noDataNode;
		}
		else {
			grid.cleanup();
		}
		grid.contentNode.innerHTML = '';
	}
	function cleanupLoading(grid) {
		if (grid.loadingNode) {
			put(grid.loadingNode, '!');
			delete grid.loadingNode;
		}
		else if (grid._oldPageNodes) {
			// If cleaning up after a load w/ showLoadingMessage: false,
			// be careful to only clean up rows from the old page, not the new one
			for (var id in grid._oldPageNodes) {
				grid.removeRow(grid._oldPageNodes[id]);
			}
			delete grid._oldPageNodes;
		}
		delete grid._isLoading;
	}

	return declare(_StoreMixin, {
		// summary:
		//		An extension for adding discrete pagination to a List or Grid.

		// rowsPerPage: Number
		//		Number of rows (items) to show on a given page.
		rowsPerPage: 10,

		// pagingTextBox: Boolean
		//		Indicates whether or not to show a textbox for paging.
		pagingTextBox: false,
		// previousNextArrows: Boolean
		//		Indicates whether or not to show the previous and next arrow links.
		previousNextArrows: true,
		// firstLastArrows: Boolean
		//		Indicates whether or not to show the first and last arrow links.
		firstLastArrows: false,

		// pagingLinks: Number
		//		The number of page links to show on each side of the current page
		//		Set to 0 (or false) to disable page links.
		pagingLinks: 2,
		// pageSizeOptions: Array[Number]
		//		This provides options for different page sizes in a drop-down.
		//		If it is empty (default), no page size drop-down will be displayed.
		pageSizeOptions: null,

		// showLoadingMessage: Boolean
		//		If true, clears previous data and displays loading node when requesting
		//		another page; if false, leaves previous data in place until new data
		//		arrives, then replaces it immediately.
		showLoadingMessage: true,

		// i18nPagination: Object
		//		This object contains all of the internationalized strings as
		//		key/value pairs.
		i18nPagination: i18n,

		showFooter: true,
		_currentPage: 1,

		buildRendering: function () {
			this.inherited(arguments);

			// add pagination to footer
			var grid = this,
				paginationNode = this.paginationNode =
					put(this.footerNode, 'div.dgrid-pagination'),
				statusNode = this.paginationStatusNode =
					put(paginationNode, 'div.dgrid-status'),
				i18n = this.i18nPagination,
				navigationNode,
				node;

			statusNode.tabIndex = 0;

			// Initialize UI based on pageSizeOptions and rowsPerPage
			this._updatePaginationSizeSelect();
			this._updateRowsPerPageOption();

			// initialize some content into paginationStatusNode, to ensure
			// accurate results on initial resize call
			this._updatePaginationStatus(this._total);

			navigationNode = this.paginationNavigationNode =
				put(paginationNode, 'div.dgrid-navigation');

			if (this.firstLastArrows) {
				// create a first-page link
				node = this.paginationFirstNode =
					put(navigationNode,  'span.dgrid-first.dgrid-page-link', '«');
				node.setAttribute('aria-label', i18n.gotoFirst);
				node.tabIndex = 0;
			}
			if (this.previousNextArrows) {
				// create a previous link
				node = this.paginationPreviousNode =
					put(navigationNode,  'span.dgrid-previous.dgrid-page-link', '‹');
				node.setAttribute('aria-label', i18n.gotoPrev);
				node.tabIndex = 0;
			}

			this.paginationLinksNode = put(navigationNode, 'span.dgrid-pagination-links');
			if (this.previousNextArrows) {
				// create a next link
				node = this.paginationNextNode =
					put(navigationNode, 'span.dgrid-next.dgrid-page-link', '›');
				node.setAttribute('aria-label', i18n.gotoNext);
				node.tabIndex = 0;
			}
			if (this.firstLastArrows) {
				// create a last-page link
				node = this.paginationLastNode =
					put(navigationNode,  'span.dgrid-last.dgrid-page-link', '»');
				node.setAttribute('aria-label', i18n.gotoLast);
				node.tabIndex = 0;
			}

			/* jshint maxlen: 121 */
			this._listeners.push(on(navigationNode, '.dgrid-page-link:click,.dgrid-page-link:keydown', function (event) {
				// For keyboard events, only respond to enter
				if (event.type === 'keydown' && event.keyCode !== 13) {
					return;
				}

				var cls = this.className,
					curr, max;

				if (grid._isLoading || cls.indexOf('dgrid-page-disabled') > -1) {
					return;
				}

				curr = grid._currentPage;
				max = Math.ceil(grid._total / grid.rowsPerPage);

				// determine navigation target based on clicked link's class
				if (this === grid.paginationPreviousNode) {
					grid.gotoPage(curr - 1);
				}
				else if (this === grid.paginationNextNode) {
					grid.gotoPage(curr + 1);
				}
				else if (this === grid.paginationFirstNode) {
					grid.gotoPage(1);
				}
				else if (this === grid.paginationLastNode) {
					grid.gotoPage(max);
				}
				else if (cls === 'dgrid-page-link') {
					grid.gotoPage(+this.innerHTML); // the innerHTML has the page number
				}
			}));
		},

		destroy: function () {
			this.inherited(arguments);
			if (this._pagingTextBoxHandle) {
				this._pagingTextBoxHandle.remove();
			}
		},

		_updatePaginationSizeSelect: function () {
			// summary:
			//		Creates or repopulates the pagination size selector based on
			//		the values in pageSizeOptions. Called from buildRendering
			//		and _setPageSizeOptions.

			var pageSizeOptions = this.pageSizeOptions,
				paginationSizeSelect = this.paginationSizeSelect,
				handle;

			if (pageSizeOptions && pageSizeOptions.length) {
				if (!paginationSizeSelect) {
					// First time setting page options; create the select
					paginationSizeSelect = this.paginationSizeSelect =
						put(this.paginationNode, 'select.dgrid-page-size[aria-label=' +
							this.i18nPagination.rowsPerPage + ']');

					handle = this._paginationSizeChangeHandle =
						on(paginationSizeSelect, 'change', lang.hitch(this, function () {
							this.set('rowsPerPage', +this.paginationSizeSelect.value);
						}));
					this._listeners.push(handle);
				}

				// Repopulate options
				paginationSizeSelect.options.length = 0;
				for (var i = 0; i < pageSizeOptions.length; i++) {
					put(paginationSizeSelect, 'option', pageSizeOptions[i], {
						value: pageSizeOptions[i],
						selected: this.rowsPerPage === pageSizeOptions[i]
					});
				}
				// Ensure current rowsPerPage value is in options
				this._updateRowsPerPageOption();
			}
			else if (!(pageSizeOptions && pageSizeOptions.length) && paginationSizeSelect) {
				// pageSizeOptions was removed; remove/unhook the drop-down
				put(paginationSizeSelect, '!');
				this.paginationSizeSelect = null;
				this._paginationSizeChangeHandle.remove();
			}
		},

		_setPageSizeOptions: function (pageSizeOptions) {
			this.pageSizeOptions = pageSizeOptions && pageSizeOptions.sort(function (a, b) {
				return a - b;
			});
			this._updatePaginationSizeSelect();
		},

		_updateRowsPerPageOption: function () {
			// summary:
			//		Ensures that an option for rowsPerPage's value exists in the
			//		paginationSizeSelect drop-down (if one is rendered).
			//		Called from buildRendering and _setRowsPerPage.

			var rowsPerPage = this.rowsPerPage,
				pageSizeOptions = this.pageSizeOptions,
				paginationSizeSelect = this.paginationSizeSelect;

			if (paginationSizeSelect) {
				if (arrayUtil.indexOf(pageSizeOptions, rowsPerPage) < 0) {
					this._setPageSizeOptions(pageSizeOptions.concat([rowsPerPage]));
				}
				else {
					paginationSizeSelect.value = '' + rowsPerPage;
				}
			}
		},

		_setRowsPerPage: function (rowsPerPage) {
			this.rowsPerPage = rowsPerPage;
			this._updateRowsPerPageOption();
			this.gotoPage(1);
		},

		_updateNavigation: function (total) {
			// summary:
			//		Update status and navigation controls based on total count from query

			var grid = this,
				i18n = this.i18nPagination,
				linksNode = this.paginationLinksNode,
				currentPage = this._currentPage,
				pagingLinks = this.pagingLinks,
				paginationNavigationNode = this.paginationNavigationNode,
				end = Math.ceil(total / this.rowsPerPage),
				pagingTextBoxHandle = this._pagingTextBoxHandle,
				focused = document.activeElement,
				focusedPage,
				lastFocusablePageLink,
				focusableNodes;

			function pageLink(page, addSpace) {
				var link;
				var disabled;
				if (grid.pagingTextBox && page === currentPage && end > 1) {
					// use a paging text box if enabled instead of just a number
					link = put(linksNode, 'input.dgrid-page-input[type=text][value=$]', currentPage);
					link.setAttribute('aria-label', i18n.jumpPage);
					grid._pagingTextBoxHandle = on(link, 'change', function () {
						var value = +this.value;
						if (!isNaN(value) && value > 0 && value <= end) {
							grid.gotoPage(+this.value);
						}
					});
					if (focused && focused.tagName === 'INPUT') {
						link.focus();
					}
				}
				else {
					// normal link
					disabled = page === currentPage;
					link = put(linksNode,
						'span' + (disabled ? '.dgrid-page-disabled' : '') + '.dgrid-page-link',
						page + (addSpace ? ' ' : ''));
					link.setAttribute('aria-label', i18n.gotoPage);
					link.tabIndex = disabled ? -1 : 0;

					// Try to restore focus if applicable;
					// if we need to but can't, try on the previous or next page,
					// depending on whether we're at the end
					if (focusedPage === page) {
						if (!disabled) {
							link.focus();
						}
						else if (page < end) {
							focusedPage++;
						}
						else {
							lastFocusablePageLink.focus();
						}
					}

					if (!disabled) {
						lastFocusablePageLink = link;
					}
				}
			}

			function setDisabled(link, disabled) {
				put(link, (disabled ? '.' : '!') + 'dgrid-page-disabled');
				link.tabIndex = disabled ? -1 : 0;
			}

			if (!focused || !this.paginationNavigationNode.contains(focused)) {
				focused = null;
			}
			else if (focused.className === 'dgrid-page-link') {
				focusedPage = +focused.innerHTML;
			}

			if (pagingTextBoxHandle) {
				pagingTextBoxHandle.remove();
			}
			linksNode.innerHTML = '';
			query('.dgrid-first, .dgrid-previous', paginationNavigationNode).forEach(function (link) {
				setDisabled(link, currentPage === 1);
			});
			query('.dgrid-last, .dgrid-next', paginationNavigationNode).forEach(function (link) {
				setDisabled(link, currentPage >= end);
			});

			if (pagingLinks && end > 0) {
				// always include the first page (back to the beginning)
				pageLink(1, true);
				var start = currentPage - pagingLinks;
				if (start > 2) {
					// visual indication of skipped page links
					put(linksNode, 'span.dgrid-page-skip', '...');
				}
				else {
					start = 2;
				}
				// now iterate through all the page links we should show
				for (var i = start; i < Math.min(currentPage + pagingLinks + 1, end); i++) {
					pageLink(i, true);
				}
				if (currentPage + pagingLinks + 1 < end) {
					put(linksNode, 'span.dgrid-page-skip', '...');
				}
				// last link
				if (end > 1) {
					pageLink(end);
				}
			}
			else if (grid.pagingTextBox) {
				// The pageLink function is also used to create the paging textbox.
				pageLink(currentPage);
			}

			if (focused && focused.tabIndex === -1) {
				// One of the first/last or prev/next links was focused but
				// is now disabled, so find something focusable
				focusableNodes = query('[tabindex="0"]', this.paginationNavigationNode);
				if (focused === this.paginationPreviousNode || focused === this.paginationFirstNode) {
					focused = focusableNodes[0];
				}
				else if (focusableNodes.length) {
					focused = focusableNodes[focusableNodes.length - 1];
				}
				if (focused) {
					focused.focus();
				}
			}
		},

		_updatePaginationStatus: function (total) {
			var count = this.rowsPerPage;
			var start = Math.min(total, (this._currentPage - 1) * count + 1);
			this.paginationStatusNode.innerHTML = string.substitute(this.i18nPagination.status, {
				start: start,
				end: Math.min(total, start + count - 1),
				total: total
			});
		},

		refresh: function (options) {
			// summary:
			//		Re-renders the first page of data, or the current page if
			//		options.keepCurrentPage is true.

			var self = this;
			var page = options && options.keepCurrentPage ?
				Math.min(this._currentPage, Math.ceil(this._total / this.rowsPerPage)) : 1;

			this.inherited(arguments);

			// Reset to first page and return promise from gotoPage
			return this.gotoPage(page).then(function (results) {
				// Emit on a separate turn to enable event to be used consistently for
				// initial render, regardless of whether the backing store is async
				setTimeout(function () {
					on.emit(self.domNode, 'dgrid-refresh-complete', {
						bubbles: true,
						cancelable: false,
						grid: self
					});
				}, 0);

				return results;
			});
		},

		_onNotification: function (rows, event, collection) {
			var rowsPerPage = this.rowsPerPage;
			var pageEnd = this._currentPage * rowsPerPage;
			var needsRefresh = (event.type === 'add' && event.index < pageEnd) ||
				(event.type === 'delete' && event.previousIndex < pageEnd) ||
				(event.type === 'update' &&
					Math.floor(event.index / rowsPerPage) !== Math.floor(event.previousIndex / rowsPerPage));

			if (needsRefresh) {
				// Refresh the current page to maintain correct number of rows on page
				this.gotoPage(Math.min(this._currentPage, Math.ceil(event.totalLength / this.rowsPerPage)) || 1);
			}
			// If we're not updating the whole page, check if we at least need to update status/navigation
			else if (collection === this._renderedCollection && event.totalLength !== this._total) {
				this._updatePaginationStatus(event.totalLength);
				this._updateNavigation(event.totalLength);
			}
		},

		renderQueryResults: function (results, beforeNode) {
			var grid = this,
				rows = this.inherited(arguments);

			if (!beforeNode) {
				if (this._topLevelRequest) {
					// Cancel previous async request that didn't finish
					this._topLevelRequest.cancel();
					delete this._topLevelRequest;
				}

				if (typeof rows.cancel === 'function') {
					// Store reference to new async request in progress
					this._topLevelRequest = rows;
				}

				rows.then(function () {
					if (grid._topLevelRequest) {
						// Remove reference to request now that it's finished
						delete grid._topLevelRequest;
					}
				});
			}

			return rows;
		},

		insertRow: function () {
			var oldNodes = this._oldPageNodes,
				row = this.inherited(arguments);

			if (oldNodes && row === oldNodes[row.id]) {
				// If the previous row was reused, avoid removing it in cleanup
				delete oldNodes[row.id];
			}

			return row;
		},

		gotoPage: function (page) {
			// summary:
			//		Loads the given page.  Note that page numbers start at 1.
			var grid = this,
				start = (this._currentPage - 1) * this.rowsPerPage;

			if (!this._renderedCollection) {
				console.warn('Pagination requires a collection to operate.');
				return when([]);
			}

			if (this._renderedCollection.releaseRange) {
				this._renderedCollection.releaseRange(start, start + this.rowsPerPage);
			}

			return this._trackError(function () {
				var count = grid.rowsPerPage,
					start = (page - 1) * count,
					options = {
						start: start,
						count: count
					},
					results,
					contentNode = grid.contentNode,
					loadingNode,
					oldNodes,
					children,
					i,
					len;

				if (grid.showLoadingMessage) {
					cleanupContent(grid);
					loadingNode = grid.loadingNode = put(contentNode, 'div.dgrid-loading');
					loadingNode.innerHTML = grid.loadingMessage;
				}
				else {
					// Reference nodes to be cleared later, rather than now;
					// iterate manually since IE < 9 doesn't like slicing HTMLCollections
					grid._oldPageNodes = oldNodes = {};
					children = contentNode.children;
					for (i = 0, len = children.length; i < len; i++) {
						oldNodes[children[i].id] = children[i];
					}
				}

				// set flag to deactivate pagination event handlers until loaded
				grid._isLoading = true;

				results = grid._renderedCollection.fetchRange({
					start: start,
					end: start + count
				});

				return grid.renderQueryResults(results, null, options).then(function (rows) {
					cleanupLoading(grid);
					// Reset scroll Y-position now that new page is loaded.
					grid.scrollTo({ y: 0 });

					if (grid._rows) {
						grid._rows.min = start;
						grid._rows.max = start + count - 1;
					}

					results.totalLength.then(function (total) {
						if (!total) {
							if (grid.noDataNode) {
								put(grid.noDataNode, '!');
								delete grid.noDataNode;
							}
							// If there are no results, display the no data message.
							grid.noDataNode = put(grid.contentNode, 'div.dgrid-no-data');
							grid.noDataNode.innerHTML = grid.noDataMessage;
						}

						// Update status text based on now-current page and total.
						grid._total = total;
						grid._currentPage = page;
						grid._rowsOnPage = rows.length;
						grid._updatePaginationStatus(total);

						// It's especially important that _updateNavigation is called only
						// after renderQueryResults is resolved as well (to prevent jumping).
						grid._updateNavigation(total);
					});

					return results;
				}, function (error) {
					cleanupLoading(grid);
					throw error;
				});
			});
		}
	});
});

/**
 * @external dgrid/extensions/Pagination
 * @see https://github.com/SitePen/dgrid/blob/dev-0.4/doc/components/extensions/Pagination.md
 */

/**
 * @module
 * @class CustomizablePagination
 * @extends dgrid/extensions/Pagination
 * This class extends dgrid's built-in pagination controls and allows for them to
 * be customized
 *
 * This module is automatically mixed into the dgrid instance created in
 * TableBase.factory when a non-virtual table is constructed
 */
define('hui/table/CustomizablePagination',[
    'dojo/string',
    'dgrid/extensions/Pagination',
    'dojo/on',
    'dojo/when',
    'dojo/_base/sniff',
    'xstyle/css!dgrid/css/extensions/Pagination.css'
], function(string, Pagination, on, when) {
    function createButton(props) {
        var node = document.createElement('button');
        node.appendChild(document.createTextNode(props.value));
        node.classList.add(props.className);
        node.classList.add('dgrid-page-link');
        node.setAttribute('aria-label', props.label);
        node.tabIndex = props.tabIndex || 0;
        return node;
    }

    var paginationUpdateNavigation = Pagination.prototype._updateNavigation;

    Pagination.extend({
        /**
         * Indicates how many pages to show
         * @type {Number}
         * @default
         */
        pagingLinks: 0,

        /**
         * Indicates whether or not to show the first and last arrow links.
         * @type {Boolean}
         * @default
         */
        firstLastArrows: true,

        buildRendering: function() {
            this.inherited(arguments);

            var paginationNode = this.paginationNode = document.createElement('div'),
                statusNode = this.paginationStatusNode = document.createElement('div'),
                navigationNode = this.paginationNavigationNode = document.createElement('div'),
                linksNode = this.paginationLinksNode = document.createElement('div'),
                grid = this,
                i18n = this.i18nPagination;

            paginationNode.classList.add('dgrid-pagination');
            this.footerNode.appendChild(paginationNode);

            statusNode.classList.add('dgrid-status');

            navigationNode.classList.add('dgrid-navigation');
            navigationNode.setAttribute('role', 'navigation');
            navigationNode.setAttribute('aria-label', this.paginationAriaLabel);
            paginationNode.appendChild(navigationNode);

            linksNode.classList.add('dgrid-pagination-links');

            statusNode.tabIndex = -1;

            this._updatePaginationSizeSelect();
            this._updateRowsPerPageOption();
            this._updatePaginationStatus(this._total);

            this.paginationFirstNode = createButton({
                className: 'dgrid-first',
                value: this.paginationFirstText,
                label: i18n.gotoFirst
            });
            navigationNode.appendChild(this.paginationFirstNode);

            this.paginationPreviousNode = createButton({
                className: 'dgrid-previous',
                value: this.paginationPreviousText,
                label: i18n.gotoPrev
            });
            navigationNode.appendChild(this.paginationPreviousNode);

            navigationNode.appendChild(statusNode);
            navigationNode.appendChild(linksNode);

            this.paginationNextNode = createButton({
                className: 'dgrid-next',
                value: this.paginationNextText,
                label: i18n.gotoNext
            });
            navigationNode.appendChild(this.paginationNextNode);

            this.paginationLastNode = createButton({
                className: 'dgrid-last',
                value: this.paginationLastText,
                label: i18n.gotoLast
            });
            navigationNode.appendChild(this.paginationLastNode);

            /* istanbul ignore next */
            this._listeners.push(on(navigationNode, '.dgrid-page-link:click,.dgrid-page-link:keydown', function(event) {
                // For keyboard events, only respond to enter
                if (event.type === 'keydown' && event.keyCode !== 13) {
                    return;
                }

                var cls = this.className,
                    curr, max;

                if (grid._isLoading || cls.indexOf('dgrid-page-disabled') > -1) {
                    return;
                }

                curr = grid._currentPage;
                max = Math.ceil(grid._total / grid.rowsPerPage);

                // determine navigation target based on clicked link's class
                if (this === grid.paginationPreviousNode) {
                    grid.gotoPage(curr - 1);
                } else if (this === grid.paginationNextNode) {
                    grid.gotoPage(curr + 1);
                } else if (this === grid.paginationFirstNode) {
                    grid.gotoPage(1);
                } else if (this === grid.paginationLastNode) {
                    grid.gotoPage(max);
                } else if (cls === 'dgrid-page-link') {
                    grid.gotoPage(+this.innerHTML); // the innerHTML has the page number
                }
            }));
            this._paginationButtons = [
                this.paginationFirstNode,
                this.paginationPreviousNode,
                this.paginationNextNode,
                this.paginationLastNode
            ];
        },

        refresh: function(options) {
            options = options || {};
            options.keepCurrentPage = !this._firstRun && this._currentPage && options.keepCurrentPage !== false ? true: options.keepCurrentPage;
            var self = this,
                page = options && options.keepCurrentPage ?
                Math.min(this._currentPage, Math.ceil(this._total / this.rowsPerPage)) || 1 : 1;

            if ((this.keepScrollPosition || options.keepScrollPosition) && (options.keepCurrentPage || this.keepCurrentPage)) {
                this._previousScrollPosition = this.getScrollPosition();
            }
            this.inherited(arguments);

            // Reset to first page and return promise from gotoPage
            return this.gotoPage(page).then(function(results) {
                // Emit on a separate turn to enable event to be used consistently for
                // initial render, regardless of whether the backing store is async
                setTimeout(function() {
                    on.emit(self.domNode, 'dgrid-refresh-complete', {
                        bubbles: true,
                        cancelable: false,
                        grid: self
                    });
                }, 0);

                return results;
            });
        },

        /**
         * Override the original gotoPage method to prevent a warning if the collection doesn't
         * exist on the grid yet
         * @override
         */
        gotoPage: function() {
            if (!this._renderedCollection) {
                // This check is being added here to prevent the console.warn message from appearing
                // when the instance has no store yet. This can occur because of differences in lifecycle
                // between dgrid instances and custom elements.
                return when([]);
            }

            // if we're refreshing the page instead of moving to another, we don't want to clear the selection
            if (this._currentPage !== arguments[0]) {
                this.clearSelection();
            }

            return this.inherited(arguments);
        },

        _updateNavigation: function(total) {
            paginationUpdateNavigation.call(this, total);
            this._paginationButtons.forEach(function(button) {
                button.disabled = button.tabIndex === -1;
                button.removeAttribute('tabindex');
            });
        },

        _updatePaginationStatus: function(total) {
            var count = this.rowsPerPage,
                start = Math.min(total, (this._currentPage - 1) * count + 1);

            this.paginationStatusNode.innerHTML = string.substitute(
                this.paginationText ? this.paginationText : this.i18nPagination.status,
                {
                    start: start,
                    end: Math.min(total, start + count - 1),
                    total: total
                }
            );
        },

        _setPaginationFirstText: function(paginationFirstText) {
            this.paginationFirstText = paginationFirstText;
            this.paginationFirstNode.textContent = paginationFirstText;
        },

        _setPaginationPreviousText: function(paginationPreviousText) {
            this.paginationPreviousText = paginationPreviousText;
            this.paginationPreviousNode.textContent = paginationPreviousText;
        },

        _setPaginationNextText: function(paginationNextText) {
            this.paginationNextText = paginationNextText;
            this.paginationNextNode.textContent = paginationNextText;
        },

        _setPaginationLastText: function(paginationLastText) {
            this.paginationLastText = paginationLastText;
            this.paginationLastNode.textContent = paginationLastText;
        },

        /**
         * Disables and re-enables pagination buttons
         * @param {Boolean} enabled - Flag indicating whether the pagination buttons are to be enabled or disabled
         * @private
         */
        _togglePaginationButtons: function(enabled) {
            [this.paginationFirstNode, this.paginationPreviousNode, this.paginationNextNode, this.paginationLastNode].forEach(function(button) {
                button.disabled = !enabled;
            });
        }
    });

    return Pagination;
});

define('dgrid-0.4/util/has-css3',[
	'dojo/has'
], function (has) {
	// This module defines feature tests for CSS3 features such as transitions.
	// The css-transitions, css-transforms, and css-transforms3d has-features
	// can report either boolean or string:
	// * false indicates no support
	// * true indicates prefix-less support
	// * string indicates the vendor prefix under which the feature is supported

	var cssPrefixes = ['ms', 'O', 'Moz', 'Webkit'];

	function testStyle(element, property) {
		var style = element.style,
			i;

		if (property in style) {
			// Standard, no prefix
			return true;
		}
		property = property.slice(0, 1).toUpperCase() + property.slice(1);
		for (i = cssPrefixes.length; i--;) {
			if ((cssPrefixes[i] + property) in style) {
				// Vendor-specific css property prefix
				return cssPrefixes[i];
			}
		}

		// Otherwise, not supported
		return false;
	}

	has.add('css-transitions', function (global, doc, element) {
		return testStyle(element, 'transitionProperty');
	});

	has.add('css-transforms', function (global, doc, element) {
		return testStyle(element, 'transform');
	});

	has.add('css-transforms3d', function (global, doc, element) {
		return testStyle(element, 'perspective');
	});

	has.add('transitionend', function () {
		// Infer transitionend event name based on CSS transitions has-feature.
		var tpfx = has('css-transitions');
		if (!tpfx) {
			return false;
		}
		if (tpfx === true) {
			return 'transitionend';
		}
		return {
			ms: 'MSTransitionEnd',
			O: 'oTransitionEnd',
			Moz: 'transitionend',
			Webkit: 'webkitTransitionEnd'
		}[tpfx];
	});

	return has;
});

define('dgrid-0.4/Tree',[
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/_base/array',
	'dojo/aspect',
	'dojo/on',
	'dojo/query',
	'dojo/when',
	'./util/has-css3',
	'./Grid',
	'dojo/has!touch?./util/touch',
	'put-selector/put'
], function (declare, lang, arrayUtil, aspect, on, querySelector, when, has, Grid, touchUtil, put) {

	return declare(null, {
		// collapseOnRefresh: Boolean
		//		Whether to collapse all expanded nodes any time refresh is called.
		collapseOnRefresh: false,

		// enableTreeTransitions: Boolean
		//		Enables/disables all expand/collapse CSS transitions.
		enableTreeTransitions: true,

		// treeIndentWidth: Number
		//		Width (in pixels) of each level of indentation.
		treeIndentWidth: 9,

		constructor: function () {
			this._treeColumnListeners = [];
		},

		shouldExpand: function (row, level, previouslyExpanded) {
			// summary:
			//		Function called after each row is inserted to determine whether
			//		expand(rowElement, true) should be automatically called.
			//		The default implementation re-expands any rows that were expanded
			//		the last time they were rendered (if applicable).

			return previouslyExpanded;
		},

		expand: function (target, expand, noTransition) {
			// summary:
			//		Expands the row corresponding to the given target.
			// target: Object
			//		Row object (or something resolvable to one) to expand/collapse.
			// expand: Boolean?
			//		If specified, designates whether to expand or collapse the row;
			//		if unspecified, toggles the current state.

			if (!this._treeColumn) {
				return;
			}

			var grid = this,
				row = target.element ? target : this.row(target),
				isExpanded = !!this._expanded[row.id],
				hasTransitionend = has('transitionend'),
				promise;

			target = row.element;
			target = target.className.indexOf('dgrid-expando-icon') > -1 ? target :
				querySelector('.dgrid-expando-icon', target)[0];

			noTransition = noTransition || !this.enableTreeTransitions;

			if (target && target.mayHaveChildren && (noTransition || expand !== isExpanded)) {
				// toggle or set expand/collapsed state based on optional 2nd argument
				var expanded = expand === undefined ? !this._expanded[row.id] : expand;

				// update the expando display
				put(target, '.ui-icon-triangle-1-' + (expanded ? 'se' : 'e') +
					'!ui-icon-triangle-1-' + (expanded ? 'e' : 'se'));
				put(row.element, (expanded ? '.' : '!') + 'dgrid-row-expanded');

				var rowElement = row.element,
					container = rowElement.connected,
					containerStyle,
					scrollHeight,
					options = {};

				if (!container) {
					// if the children have not been created, create a container, a preload node and do the
					// query for the children
					container = options.container = rowElement.connected =
						put(rowElement, '+div.dgrid-tree-container');
					var query = function (options) {
						var childCollection = grid._renderedCollection.getChildren(row.data),
							results;
						if (grid.sort && grid.sort.length > 0) {
							childCollection = childCollection.sort(grid.sort);
						}
						if (childCollection.track && grid.shouldTrackCollection) {
							container._rows = options.rows = [];

							childCollection = childCollection.track();

							// remember observation handles so they can be removed when the parent row is destroyed
							container._handles = [
								childCollection.tracking,
								grid._observeCollection(childCollection, container, options)
							];
						}
						if ('start' in options) {
							var rangeArgs = {
								start: options.start,
								end: options.start + options.count
							};
							results = childCollection.fetchRange(rangeArgs);
						} else {
							results = childCollection.fetch();
						}
						return results;
					};
					// Include level information on query for renderQuery case
					if ('level' in target) {
						query.level = target.level;
					}

					// Add the query to the promise chain
					if (this.renderQuery) {
						promise = this.renderQuery(query, options);
					}
					else {
						// If not using OnDemandList, we don't need preload nodes,
						// but we still need a beforeNode to pass to renderArray,
						// so create a temporary one
						var firstChild = put(container, 'div');
						promise = this._trackError(function () {
							return grid.renderQueryResults(
								query(options),
								firstChild,
								lang.mixin({ rows: options.rows },
									'level' in query ? { queryLevel: query.level } : null
								)
							).then(function (rows) {
								put(firstChild, '!');
								return rows;
							});
						});
					}

					if (hasTransitionend) {
						// Update height whenever a collapse/expand transition ends.
						// (This handler is only registered when each child container is first created.)
						on(container, hasTransitionend, this._onTreeTransitionEnd);
					}
				}

				// Show or hide all the children.

				container.hidden = !expanded;
				containerStyle = container.style;

				// make sure it is visible so we can measure it
				if (!hasTransitionend || noTransition) {
					containerStyle.display = expanded ? 'block' : 'none';
					containerStyle.height = '';
				}
				else {
					if (expanded) {
						containerStyle.display = 'block';
						scrollHeight = container.scrollHeight;
						containerStyle.height = '0px';
					}
					else {
						// if it will be hidden we need to be able to give a full height
						// without animating it, so it has the right starting point to animate to zero
						put(container, '.dgrid-tree-resetting');
						containerStyle.height = container.scrollHeight + 'px';
					}
					// Perform a transition for the expand or collapse.
					setTimeout(function () {
						put(container, '!dgrid-tree-resetting');
						containerStyle.height =
							expanded ? (scrollHeight ? scrollHeight + 'px' : 'auto') : '0px';
					}, 0);
				}

				// Update _expanded map.
				if (expanded) {
					this._expanded[row.id] = true;
				}
				else {
					delete this._expanded[row.id];
				}
			}

			// Always return a promise
			return when(promise);
		},

		_configColumns: function () {
			var columnArray = this.inherited(arguments);

			// Set up hash to store IDs of expanded rows (here rather than in
			// _configureTreeColumn so nothing breaks if no column has renderExpando)
			this._expanded = {};

			for (var i = 0, l = columnArray.length; i < l; i++) {
				if (columnArray[i].renderExpando) {
					this._configureTreeColumn(columnArray[i]);
					break; // Allow only one tree column.
				}
			}
			return columnArray;
		},

		insertRow: function (object) {
			var rowElement = this.inherited(arguments);

			// Auto-expand (shouldExpand) considerations
			var row = this.row(rowElement),
				expanded = this.shouldExpand(row, this._currentLevel, this._expanded[row.id]);

			if (expanded) {
				this.expand(rowElement, true, true);
			}

			if (expanded || (!this.collection.mayHaveChildren || this.collection.mayHaveChildren(object))) {
				put(rowElement, '.dgrid-row-expandable');
			}

			return rowElement; // pass return value through
		},

		removeRow: function (rowElement, preserveDom) {
			var connected = rowElement.connected,
				childOptions = {};
			if (connected) {
				if (connected._handles) {
					arrayUtil.forEach(connected._handles, function (handle) {
						handle.remove();
					});
					delete connected._handles;
				}

				if (connected._rows) {
					childOptions.rows = connected._rows;
				}

				querySelector('>.dgrid-row', connected).forEach(function (element) {
					this.removeRow(element, true, childOptions);
				}, this);

				if (connected._rows) {
					connected._rows.length = 0;
					delete connected._rows;
				}

				if (!preserveDom) {
					put(connected, '!');
				}
			}

			this.inherited(arguments);
		},

		cleanup: function () {
			this.inherited(arguments);

			if (this.collapseOnRefresh) {
				// Clear out the _expanded hash on each call to cleanup
				// (which generally coincides with refreshes, as well as destroy)
				this._expanded = {};
			}
		},

		_destroyColumns: function () {
			var listeners = this._treeColumnListeners;

			for (var i = listeners.length; i--;) {
				listeners[i].remove();
			}
			this._treeColumnListeners = [];
			this._treeColumn = null;
		},

		_calcRowHeight: function (rowElement) {
			// Override this method to provide row height measurements that
			// include the children of a row
			var connected = rowElement.connected;
			// if connected, need to consider this in the total row height
			return this.inherited(arguments) + (connected ? connected.offsetHeight : 0);
		},

		_configureTreeColumn: function (column) {
			// summary:
			//		Adds tree navigation capability to a column.

			var grid = this;
			var colSelector = '.dgrid-content .dgrid-column-' + column.id;
			var clicked; // tracks row that was clicked (for expand dblclick event handling)

			this._treeColumn = column;
			if (!column._isConfiguredTreeColumn) {
				var originalRenderCell = column.renderCell || this._defaultRenderCell;
				column._isConfiguredTreeColumn = true;
				column.renderCell = function (object, value, td, options) {
					// summary:
					//		Renders a cell that can be expanded, creating more rows

					var level = Number(options && options.queryLevel) + 1,
						mayHaveChildren = !grid.collection.mayHaveChildren || grid.collection.mayHaveChildren(object),
						expando, node;

					level = grid._currentLevel = isNaN(level) ? 0 : level;
					expando = column.renderExpando(level, mayHaveChildren,
						grid._expanded[grid.collection.getIdentity(object)], object);
					expando.level = level;
					expando.mayHaveChildren = mayHaveChildren;

					node = originalRenderCell.call(column, object, value, td, options);
					if (node && node.nodeType) {
						put(td, expando);
						put(td, node);
					}
					else {
						td.insertBefore(expando, td.firstChild);
					}
				};

				if (typeof column.renderExpando !== 'function') {
					column.renderExpando = this._defaultRenderExpando;
				}
			}

			var treeColumnListeners = this._treeColumnListeners;
			if (treeColumnListeners.length === 0) {
				// Set up the event listener once and use event delegation for better memory use.
				treeColumnListeners.push(this.on(column.expandOn ||
					'.dgrid-expando-icon:click,' + colSelector + ':dblclick,' + colSelector + ':keydown',
					function (event) {
						var row = grid.row(event);
						if ((!grid.collection.mayHaveChildren || grid.collection.mayHaveChildren(row.data)) &&
							(event.type !== 'keydown' || event.keyCode === 32) && !(event.type === 'dblclick' &&
							clicked && clicked.count > 1 && row.id === clicked.id &&
							event.target.className.indexOf('dgrid-expando-icon') > -1)) {
							grid.expand(row);
						}

						// If the expando icon was clicked, update clicked object to prevent
						// potential over-triggering on dblclick (all tested browsers but IE < 9).
						if (event.target.className.indexOf('dgrid-expando-icon') > -1) {
							if (clicked && clicked.id === grid.row(event).id) {
								clicked.count++;
							}
							else {
								clicked = {
									id: grid.row(event).id,
									count: 1
								};
							}
						}
					})
				);

				if (has('touch')) {
					// Also listen on double-taps of the cell.
					treeColumnListeners.push(this.on(touchUtil.selector(colSelector, touchUtil.dbltap),
						function () {
							grid.expand(this);
						}));
				}
			}
		},

		_defaultRenderExpando: function (level, hasChildren, expanded) {
			// summary:
			//		Default implementation for column.renderExpando.
			//		NOTE: Called in context of the column definition object.
			// level: Number
			//		Level of indentation for this row (0 for top-level)
			// hasChildren: Boolean
			//		Whether this item may have children (in most cases this determines
			//		whether an expando icon should be rendered)
			// expanded: Boolean
			//		Whether this item is currently in expanded state
			// object: Object
			//		The item that this expando pertains to

			var dir = this.grid.isRTL ? 'right' : 'left',
				cls = '.dgrid-expando-icon',
				node;
			if (hasChildren) {
				cls += '.ui-icon.ui-icon-triangle-1-' + (expanded ? 'se' : 'e');
			}
			node = put('div' + cls + '[style=margin-' + dir + ': ' +
				(level * this.grid.treeIndentWidth) + 'px; float: ' + dir + ']');
			node.innerHTML = '&nbsp;';
			return node;
		},

		_onNotification: function (rows, event) {
			if (event.type === 'delete') {
				delete this._expanded[event.id];
			}
			this.inherited(arguments);
		},

		_onTreeTransitionEnd: function (event) {
			var container = this,
				height = this.style.height;
			if (height) {
				// After expansion, ensure display is correct;
				// after collapse, set display to none to improve performance
				this.style.display = height === '0px' ? 'none' : 'block';
			}

			// Reset height to be auto, so future height changes (from children
			// expansions, for example), will expand to the right height.
			if (event) {
				// For browsers with CSS transition support, setting the height to
				// auto or "" will cause an animation to zero height for some
				// reason, so temporarily set the transition to be zero duration
				put(this, '.dgrid-tree-resetting');
				setTimeout(function () {
					// Turn off the zero duration transition after we have let it render
					put(container, '!dgrid-tree-resetting');
				}, 0);
			}
			// Now set the height to auto
			this.style.height = '';
		}
	});
});

/**
 * @module
 * @extends dgrid/Tree
 * @class ContentGroups
 * Extends the Tree grid plugin to provide support for content groups by
 * adding logic the display group parent items
 */
define('hui/table/ContentGroups',[
    'dojo/_base/declare',
    'dgrid/Tree',
    'dojo/has',
    'dojo/query',
    'dojo/Deferred',
    'put-selector/put',
    'dojo/has!touch?dgrid/util/touch',
    'dojo/when',
    'dojo/aspect'
], function(declare, Tree, has, querySelector, Deferred, put, touchUtil, when, aspect) {
    return declare(Tree, {
        /**
         * Sets the property to display as the title in content groups rows, and
         * tells the table to keep its scroll position, as this flag getting set means
         * that content groups will most likely be getting expanded.
         * @param {String} categoryProperty - The name of the property that will hold the content
         * group names on store items
         * @private
         */
        _setCategoryProperty: function(categoryProperty) {
            this.categoryProperty = categoryProperty;
            this.keepScrollPosition = true;
        },

        /**
         * Sets the expandAll flag, which causes all content groups to be expanded by default
         * @private
         */
        postCreate: function() {
            this.inherited(arguments);
            var callCategoryTotalSetter = function() {
                this._setCategoryTotals(this.categoryTotals);
            }.bind(this);
            //Wrap hide and show columns in an aspect
            aspect.after(this, '_hideColumn', callCategoryTotalSetter);
            aspect.after(this, '_showColumn', callCategoryTotalSetter);
        },

        _setExpandAll: function(expandAll) {
            if (this.expandAll !== expandAll) {
                this.expandAll = expandAll;
                this.refresh();
            }
        },

        /**
         * Extends the render header method to hide the cell for the category property column in
         * the header as we don't want to display that for most items.
         */
        renderHeader: function() {
            this.inherited(arguments);
            this._hideCategoryCell(this.headerNode);
        },

        /**
         * Exntends the render row method with logic to show only the category column on parent
         * rows, to render parent rows as headers, and to remove the category column from other
         * rows.
         * @param {Object} obj - The store item for which a row is being rendered
         * @returns {HTMLElement} - The rendered row element
         */
        renderRow: function(obj) {
            var row = this.inherited(arguments);

            if (this.categoryProperty) {
                if (obj[this.categoryProperty]) {
                    this._showOnlyCategoryCell(row, obj);
                } else {
                    this._hideCategoryCell(row);
                }
            }
            return row;
        },

        /**
         * Returns whether or not a row should be expanded
         * @param {Boolean} expanded - A boolean indicating whether or not
         * this row has been explicitly expanded by a user.
         * @returns {Boolean} whether or not the row should be treated as being
         * expanded
         */
        shouldExpand: function(expanded) {
            //Don\'t return true for calls from Tree
            if (arguments.length > 1) {
                return false;
            } else {
                return this.expandAll || expanded;
            }
        },
        /**
         * Sets the category totals and renders the appropriate total rows
         * @param {object} categoryTotals An object with keys corresponding to group categories, and values that are objects
         * mapping column fields to total values
         * @private
         */
        _setCategoryTotals: function(categoryTotals) {
            if (!this.categoryProperty) {
                return;
            }
            this.categoryTotals = categoryTotals || {};
            var self = this,
                filter = new this.collection.Filter();
            filter = filter.or.apply(filter, Object.keys(this.categoryTotals).map(function(key) {
                return filter.eq(self.categoryProperty, key);
            }));

            // Map the category total objects by the item's IDs instead of by the category names
            // to make finding the objects crresponding to the totals later easier.
            this.collection.filter(filter).forEach(function(item) {
                var categoryPropertyValue;
                if (self.categoryTotals.hasOwnProperty((categoryPropertyValue = item[self.categoryProperty]))) {
                    self.categoryTotals[item.id] = self.categoryTotals[categoryPropertyValue];
                    delete self.categoryTotals[categoryPropertyValue];
                }
            }).then(function() {
                self.refresh();
            });
        },

        /**
         * Sets the total label and rerenders any category total rows with the new label
         * @private
         */
        _setTotalText: function() {
            this.inherited(arguments);
            this._setCategoryTotals(this.categoryTotals);

        },

        /**
         * Delegates to _renderTotalRow to render a total row with the specified totals for the specified category,
         * and then hides the category cell for the row.
         * @param {object} totals The totals to render, should be a map of column fields to total strings/numbers
         * @param {string} categoryId The ID of the category or group to render a total row for
         * @param {object} beforeNode The row that this is being rendered in
         * @private
         */
        _renderCategoryTotalRow: function(totals, categoryId, beforeNode) {
            var totalRow = this._renderTotalRow(
                totals,
                '_' + categoryId + 'TotalRow',
                beforeNode
            );

            if (totalRow) {
                this._hideCategoryCell(totalRow);
            }
        },

        /**
         * Renders the specified row with the appropriate expando icon
         * and sets a flag indicating whether or not this row is expanded.
         * @param {Boolean} expand - An optional flag indicating whether to expand the row
         * @param {HTMLElement} row - The row that is getting expanded or collapsed
         * @param {HTMLElement} button - The button, if this row was expanded by clicking a button
         * @private
         */
        _showExpanded: function(expand, row, button) {
            var expanded,
                itemId,
                target;

            target = row.element;
            target = target.className.indexOf('dgrid-expando-icon') > -1 ? target :
                querySelector('.dgrid-expando-icon', target)[0];

            // toggle or set expand/collapsed state based on optional 2nd argument
            itemId = this.collection.getIdentity(row.data);
            // This uses == on purpose, to catch null as well as undefined
            expanded = expand == undefined ? !this._expanded[itemId] : expand;//jshint ignore: line

            // update the expando display
            put(target, '.ui-icon-triangle-1-' + (expanded ? 'se' : 'e') +
                '!ui-icon-triangle-1-' + (expanded ? 'e' : 'se'));
            put(row.element, (expanded ? '.' : '!') + 'dgrid-row-expanded');

            if (button) {
                button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            }
            if (expanded) {
                this._expanded[itemId] = true;
            } else {
                this._expanded[itemId] = false;
            }

            return expanded;
        },

        /**
         * Calls _shotExpanded to render the expanded row, and then refreshes
         * the data in the grid so that the appropriate items can be retrieved from
         * the store or server.
         * @param {_Row|Object|String} target - The row item itself, the store item representing the row,
         * or the ID of the row to be expanded
         * @param {Boolean} expand - Optional property overriding the default toggling behavior
         * @param {HTMLElement} button - Optional property passing the row's expando button domnode
         * @param {Boolean} mayHaveChildren - Optional property indicating whether this element is able to have children
         * that can avoid a redundant call to the server
         * @returns {Promise} - A Promise that doesn't have any specific meaning for this implementation, but which
         * is returned to maintain the API contract for expand
         */
        expand: function(target, expand, button, mayHaveChildren) {
            if (!this._treeColumn) {
                return when();
            }
            var tempProperty,
                grid = this,
                row = target.element ? target : this.row(target),
                expanded,
                scrollPosition = this.getScrollPosition(),
                promise,
                dfd,
                refreshListener,
                tempFarOffRemoval;

            mayHaveChildren = mayHaveChildren || (mayHaveChildren !== false &&
                (!this.collection.mayHaveChildren || this.collection.mayHaveChildren(row.data)));
            if (target && mayHaveChildren) {
                expanded = this._showExpanded(expand, row, button);
                tempProperty = this.collapseOnRefresh;
                this.collapseOnRefresh = false;

                // Temporarily store the the far off removal value because
                // it interferes with properly setting the scroll
                tempFarOffRemoval = this.farOffRemoval;
                this.farOffRemoval = Infinity;
                promise = this.refresh();
                if (grid.on && (!promise || !promise.then)) {
                    dfd = new Deferred();
                    promise = dfd.promise;

                    refreshListener = grid.on('dgrid-refresh-complete', function() {
                        dfd.resolve();
                    });
                }

                // Always return a promise
                return when(promise, function() {
                    if (refreshListener) {
                        refreshListener.remove();
                    }
                    if (scrollPosition && grid.gotoPage) {
                        // For paginated grids(that don't have _processScroll)
                        // we need to manually scroll back to our old position
                        grid.scrollTo(scrollPosition);
                    }
                    grid.farOffRemoval = tempFarOffRemoval;
                    grid.collapseOnRefresh = tempProperty;
                    return expanded;
                });
            } else {
                return when();
            }
        },

        _clicked: null,

        /**
         * Takes a column definition and modifies it and adds event listeners for content grouping
         * @param {Column} column - The exising column definition
         * @private
         */
        _configureTreeColumn: function(column) {
            var grid = this,
                colSelector = '.dgrid-content .dgrid-column-' + column.id,
                originalRenderCell = column.renderCell || this._defaultRenderCell;

            this._treeColumn = column;

            if (!grid.collection) {
                throw new Error('dgrid Tree mixin requires a collection to operate.');
            }

            if (typeof column.renderExpando !== 'function') {
                column.renderExpando = this._defaultRenderExpando;
            }

            this._treeColumnListeners.push(
                this.on(column.expandOn || colSelector + ':click,.ha-expando-button:click,.ha-expando-button:keydown',
                    this._onClick.bind(this)
                )
            );

            // Set up the event listener once and use event delegation for better memory use.
            if (has('touch')) {
                // Also listen on double-taps of the cell.
                this._treeColumnListeners.push(this.on(touchUtil.selector(colSelector, touchUtil.dbltap),
                    function() {
                        grid.expand(this);
                    })
                );
            }

            column.renderCell = function(object, value, td, options) {
                grid._renderCell(
                    column,
                    originalRenderCell,
                    object,
                    value,
                    td,
                    options
                );
            };
        },

        /**
         * Wraps the existing cell renderer to add the expando
         * @param {Column} column - The existing column definition
         * @param {Function} originalRenderCell - The original renderCell function for this column
         * @param {Object} object - The data object for this column
         * @param {any} value - The value for this cell
         * @param {HTMLElement} td - The existing td element created for this cell
         * @param {Object} options - Optional parameters
         * @private
         */
        _renderCell: function(column, originalRenderCell, object, value, td, options) {
            var grid = column.grid,
                level = Number(options && options.queryLevel) + 1,
                mayHaveChildren = !grid.collection.mayHaveChildren || grid.collection.mayHaveChildren(object),
                expando, node;

            level = grid._currentLevel = isNaN(level) ? 0 : level;
            expando = column.renderExpando(
                level,
                mayHaveChildren,
                grid._expanded[grid.collection.getIdentity(object)],
                object
            );
            expando.level = level;
            expando.mayHaveChildren = mayHaveChildren;

            node = originalRenderCell.call(column, object, value, td, options);
            if (node && node.nodeType) {
                put(td, expando);
                put(td, node);
            } else {
                td.insertBefore(expando, td.firstChild);
            }
        },

        /**
         * Handles the on click event, expanding the clicked column and focusing the first
         * element in the newly expanded group
         * @param {Event} event - The click event
         * @private
         */
        _onClick: function(event) {
            var row = this.row(event),
                id = row ? row.id : '',
                grid = this,
                mayHaveChildren;
            if ((!this.collection.mayHaveChildren || (mayHaveChildren = this.collection.mayHaveChildren(row ? row.data : null))) &&
                (event.type !== 'keydown' || event.keyCode === 32)) {
                if (event.type === 'keydown' && event.keyCode === 32) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                this.expand(row, null, null, mayHaveChildren).then(function(expanded) {
                        if (expanded && id) {
                            var row = grid.row(id);
                            if (row && row.element && row.element.nextSibling) {
                                row.element.nextSibling.focus();
                            }
                        }
                    }
                );
            }

            // If the expando icon was clicked, update clicked object to prevent
            // potential over-triggering on dblclick (all tested browsers but IE < 9).
            if (event.target.classList.contains('dgrid-expando-icon')) {
                if (this._clicked && this._clicked.id === this.row(event).id) {
                    this._clicked.count++;
                } else {
                    this._clicked = {
                        id: this.row(event).id,
                        count: 1
                    };
                }
            }
        },

        renderQueryResults: function() {
            var self = this,
                results = this.inherited(arguments);
            if (this.categoryTotals) {
                // Render category total rows
                return results.then(function(rows) {
                    var i,
                        lastRow = (rows && rows.length) ? rows[rows.length - 1]: null,
                        previousRowParent,
                        categoryTotal,
                        currentRow,
                        previousRow;
                    for (i = 0; i < rows.length; i++) {
                        previousRow = currentRow;
                        previousRowParent = previousRow && previousRow.data.parent;
                        currentRow = self.row(rows[i]);
                        if (currentRow.data.parent == null && self._expanded[previousRowParent] && //jshint ignore:line
                            (categoryTotal = self.categoryTotals[previousRowParent])) {
                            self._renderCategoryTotalRow(categoryTotal, previousRowParent, currentRow.element);
                        }
                    }

                    if (lastRow && lastRow.rowIndex >= self._total) {
                        currentRow = self.row(lastRow);
                        if (currentRow && (categoryTotal = self.categoryTotals[currentRow.data.parent])) {
                            self._renderCategoryTotalRow(categoryTotal, currentRow.data.parent, self._totalRow || null);
                        }
                    }

                    return rows;
                });
            } else {
                return results;
            }
        },

        /**
         * Extends the insertRow method to render the row as expanded if necessary
         * @returns {HTMLElement} - The rendered row element
         */
        insertRow: function() {
            var rowElement = this.inherited(arguments),
                row = this.row(rowElement),
                expanded = this.shouldExpand(row && this._expanded[row.id]);
            // Auto-expand (shouldExpand) considerations
            if (expanded) {
                this._showExpanded(true, row, rowElement.querySelector('.ha-expando-button'));
            }

            return rowElement; // pass return value through
        },

        /**
         * Extends the expando icon renderer to move the icon to the appropriate
         * side of the row.
         * @returns {HTMLElement} The expando node
         * @private
         */
        _defaultRenderExpando: function() {
            var expandoNode = Tree.prototype._defaultRenderExpando.apply(this, Array.prototype.slice.call(arguments));

            if (expandoNode.style.float === 'left') {
                expandoNode.style.float = 'right';
            } else {
                expandoNode.style.float = 'left';
            }

            return expandoNode;
        },

        /**
         * Hides the category cell in the passed in node
         * @param {HTMLElement} node - The node to hide the category cell in
         * @private
         */
        _hideCategoryCell: function(node) {
            if (this.categoryProperty) {
                Array.prototype.slice.apply(node.getElementsByClassName('field-' + this.categoryProperty)).forEach(function(fieldNode) {
                    fieldNode.classList.add('hidden');
                });
            }
        },

        /**
         * Hides all the cells exepct the category cell in the passed in node
         * @param {HTMLElement} node - The node to hide for which all the cells other than
         * the category cell should be hidden
         * @private
         */
        _showOnlyCategoryCell: function(node) {
            var categoryProperty = this.categoryProperty;
            if (categoryProperty) {
                node.classList.add('category-row');
                Array.prototype.slice.apply(node.querySelectorAll('[class*="field-"]')).forEach(function(fieldNode) {
                    if (fieldNode.classList.contains('field-' + categoryProperty)) {
                        fieldNode.classList.add('category-column');
                        var expandoButton = document.createElement('button'),
                            i,
                            child,
                            ariaLabelSpan = document.createElement('span');
                        expandoButton.classList.add('ha-expando-button');
                        expandoButton.setAttribute('aria-expanded', 'false');
                        expandoButton.setAttribute('tabindex', '0');

                        ariaLabelSpan.classList.add('sr-only');
                        ariaLabelSpan.textContent = 'expand/collapse ' + fieldNode.textContent.trim();

                        for (i = fieldNode.children.length - 1; i >= 0; i--) {
                            child = fieldNode.children[i];
                            fieldNode.removeChild(child);
                            if (child.style.float) {
                                expandoButton.classList.add('ha-expando-' + child.style.float);
                            }
                            expandoButton.insertBefore(child, expandoButton.firstChild);
                        }
                        expandoButton.insertBefore(ariaLabelSpan, expandoButton.firstChild);
                        fieldNode.appendChild(expandoButton);

                    } else {
                        fieldNode.classList.add('hidden');
                    }
                });
            }
        },

        /**
         * Builds an array containing all the IDs of the groups that are currently expanded
         * @returns {Array} - The IDs of the groups that are currently expanded
         * @private
         */
        _getExpanded: function() {
            var expanded = [],
                category;
            for (category in this._expanded) {
                if (this._expanded.hasOwnProperty(category) && (this.expandAll || this._expanded[category])) {
                    expanded.push(category);
                }
            }

            return expanded;
        }
    });
});

/**
 * @external dgrid/extensions/Pagination
 * @see https://github.com/SitePen/dgrid/blob/dev-0.4/doc/components/extensions/Pagination.md
 */

/**
 * @module
 * @class ContentGroupPagination
 * @extends dgrid/extensions/Pagination
 *
 * This module extends dgrid's built-in pagination module to add an
 * additional understanding of content grouping and navigating within
 * the content groups.
 *
 * This module is automatically mixed into the dgrid instance
 * created in TableBase.factory for non-virtual tables
 */
define('hui/table/ContentGroupPagination',[
    'dojo/_base/declare',
    'dojo/when',
    'put-selector/put',
    './CustomizablePagination',
    './ContentGroups'
], function(declare, when, put, CustomizablePagination, ContentGroups) {

    /**
     * Removes any currently-rendered rows, or noDataMessage
     * @param {Grid} grid - The grid to clean up
     */
    function cleanupContent(grid) {
        if (grid.noDataNode) {
            put(grid.noDataNode, '!');
            delete grid.noDataNode;
        } else {
            grid.cleanup();
        }
        grid.contentNode.innerHTML = '';
    }

    /**
     * Cleans up loading messages on a grid
     * @param {Grid} grid - The grid to clean up
     */
    function cleanupLoading(grid) {
        if (grid.loadingNode) {
            put(grid.loadingNode, '!');
            delete grid.loadingNode;
        } else if (grid._oldPageNodes) {
            // If cleaning up after a load w/ showLoadingMessage: false,
            // be careful to only clean up rows from the old page, not the new one
            for (var id in grid._oldPageNodes) {
                grid.removeRow(grid._oldPageNodes[id]);
            }
            delete grid._oldPageNodes;
        }
        delete grid._isLoading;
    }

    /**
     * Extends pagination to work with content groups
     */
    return declare([CustomizablePagination, ContentGroups], {
        /**
         * Renders divs indicating that no data was available
         * under any expanded groups that have no children.
         * @private
         */
        _renderNoDataDivs: function() {
            var grid = this;
            Array.prototype.map.call(grid.contentNode.getElementsByClassName('category-row'), function(element) {
                return grid.row(element);
            }).forEach(function(row) {
                if (row && grid._expanded[grid.collection.getIdentity(row.data)] &&
                    (row.element.parentNode.lastChild === row.element ||
                    row.element.nextSibling.classList.contains('category-row'))) {
                    var noDataDiv = document.createElement('div');
                    noDataDiv.classList.add('ha-table-no-data');
                    noDataDiv.textContent = 'No Data Available';

                    if (row.element.nextSibling) {
                        row.element.parentNode.insertBefore(noDataDiv, row.element.nextSibling);
                    } else {
                        row.element.parentNode.appendChild(noDataDiv);
                    }
                }
            });
        },

        /**
         * Loads the given page.  Note that page numbers start at 1.
         * @param {Number} page - The number of the page to display
         * @return (Promise} Returns a promise that indicates whether the
         * operation completed successfully or encountered an error
         */
        gotoPage: function(page) {
            var grid = this,
                start = (this._currentPage - 1) * this.rowsPerPage;

            if (!this._renderedCollection) {
                return when([]);
            }

            // if we're refreshing the page instead of moving to another, we don't want to clear the selection
            if (this._currentPage !== arguments[0]) {
                this.clearSelection();
            }

            if (this._renderedCollection.releaseRange) {
                this._renderedCollection.releaseRange(start, start + this.rowsPerPage);
            }

            return this._trackError(function() {
                var count = grid.rowsPerPage,
                    start = (page - 1) * count,
                    options = {
                        start: start,
                        count: count
                    },
                    results,
                    contentNode = grid.contentNode,
                    loadingNode,
                    oldNodes,
                    children,
                    i,
                    len,
                    expanded = grid._getExpanded();

                if (grid.showLoadingMessage) {
                    cleanupContent(grid);
                    loadingNode = grid.loadingNode = put(contentNode, 'div.dgrid-loading[role=alert]');
                    loadingNode.innerHTML = grid.loadingMessage;
                } else {
                    // Reference nodes to be cleared later, rather than now;
                    // iterate manually since IE < 9 doesn't like slicing HTMLCollections
                    grid._oldPageNodes = oldNodes = {};
                    children = contentNode.children;
                    for (i = 0, len = children.length; i < len; i++) {
                        oldNodes[children[i].id] = children[i];
                    }
                }

                // set flag to deactivate pagination event handlers until loaded
                grid._isLoading = true;

                results = grid._renderedCollection.fetchGroupRange ? grid._renderedCollection.fetchGroupRange({
                    start: start,
                    end: start + count,
                    expanded: expanded
                }) : grid._renderedCollection.fetchRange({
                    start: start,
                    end: start + count
                });

                return grid.renderQueryResults(results, null, options).then(function(rows) {
                    cleanupLoading(grid);
                    if (grid._previousScrollPosition) {
                        grid.scrollTo(grid._previousScrollPosition);
                        grid._previousScrollPosition = null;
                    } else {
                        // Reset scroll Y-position now that new page is loaded.
                        grid.scrollTo({y: 0});

                    }

                    if (grid._rows) {
                        grid._rows.min = start;
                        grid._rows.max = start + count - 1;
                    }

                    when(results.totalLength, function(total) {
                        if (!total) {
                            if (grid.noDataNode) {
                                put(grid.noDataNode, '!');
                                delete grid.noDataNode;
                            }
                            // If there are no results, display the no data message.
                            grid.noDataNode = put(grid.contentNode, 'div.dgrid-no-data[role=gridcell]');
                            grid.noDataNode.innerHTML = grid.noDataMessage;
                        }
                        when(results, function(results) {
                            when (results.start, function(start) {
                                // Update status text based on now-current page and total.
                                page = start ? (start - 1) / count + 1 : page;
                                grid._total = total;
                                grid._currentPage = page;
                                grid._rowsOnPage = rows.length;
                                grid._updatePaginationStatus(total);

                                when(results.isLastPage, function(isLastPage) {
                                    if (isLastPage) {
                                        // It's especially important that _updateNavigation is called only
                                        // after renderQueryResults is resolved as well (to prevent jumping).
                                        grid._updateNavigation(total);
                                        grid.paginationNextNode.disabled = grid.paginationLastNode.disabled = true;
                                        grid.paginationNextNode.classList.add('dgrid-page-disabled');
                                        grid.paginationLastNode.classList.add('dgrid-page-disabled');
                                    } else {
                                        grid.paginationNextNode.disabled = grid.paginationLastNode.disabled = false;
                                        grid.paginationNextNode.classList.remove('dgrid-page-disabled');
                                        grid.paginationLastNode.classList.remove('dgrid-page-disabled');
                                        // It's especially important that _updateNavigation is called only
                                        // after renderQueryResults is resolved as well (to prevent jumping).
                                        grid._updateNavigation(total);
                                    }
                                });
                            });
                        });
                    });
                    grid._renderNoDataDivs();
                    return results;
                }, function(error) {
                    cleanupLoading(grid);
                    throw error;
                });
            });
        }
    });
});

define('dgrid-0.4/OnDemandList',[
	'./List',
	'./_StoreMixin',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/on',
	'dojo/when',
	'./util/misc',
	'put-selector/put'
], function (List, _StoreMixin, declare, lang, on, when, miscUtil, put) {

	return declare([ List, _StoreMixin ], {
		// summary:
		//		Extends List to include virtual scrolling functionality, querying a
		//		dojo/store instance for the appropriate range when the user scrolls.

		// minRowsPerPage: Integer
		//		The minimum number of rows to request at one time.
		minRowsPerPage: 25,

		// maxRowsPerPage: Integer
		//		The maximum number of rows to request at one time.
		maxRowsPerPage: 250,

		// maxEmptySpace: Integer
		//		Defines the maximum size (in pixels) of unrendered space below the
		//		currently-rendered rows. Setting this to less than Infinity can be useful if you
		//		wish to limit the initial vertical scrolling of the grid so that the scrolling is
		// 		not excessively sensitive. With very large grids of data this may make scrolling
		//		easier to use, albiet it can limit the ability to instantly scroll to the end.
		maxEmptySpace: Infinity,

		// bufferRows: Integer
		//	  The number of rows to keep ready on each side of the viewport area so that the user can
		//	  perform local scrolling without seeing the grid being built. Increasing this number can
		//	  improve perceived performance when the data is being retrieved over a slow network.
		bufferRows: 10,

		// farOffRemoval: Integer
		//		Defines the minimum distance (in pixels) from the visible viewport area
		//		rows must be in order to be removed.  Setting to Infinity causes rows
		//		to never be removed.
		farOffRemoval: 2000,

		// queryRowsOverlap: Integer
		//		Indicates the number of rows to overlap queries. This helps keep
		//		continuous data when underlying data changes (and thus pages don't
		//		exactly align)
		queryRowsOverlap: 0,

		// pagingMethod: String
		//		Method (from dgrid/util/misc) to use to either throttle or debounce
		//		requests.  Default is "debounce" which will cause the grid to wait until
		//		the user pauses scrolling before firing any requests; can be set to
		//		"throttleDelayed" instead to progressively request as the user scrolls,
		//		which generally incurs more overhead but might appear more responsive.
		pagingMethod: 'debounce',

		// pagingDelay: Integer
		//		Indicates the delay (in milliseconds) imposed upon pagingMethod, to wait
		//		before paging in more data on scroll events. This can be increased to
		//		reduce client-side overhead or the number of requests sent to a server.
		pagingDelay: miscUtil.defaultDelay,

		// keepScrollPosition: Boolean
		//		When refreshing the list, controls whether the scroll position is
		//		preserved, or reset to the top.  This can also be overridden for
		//		specific calls to refresh.
		keepScrollPosition: false,

		// rowHeight: Number
		//		Average row height, computed in renderQuery during the rendering of
		//		the first range of data.
		rowHeight: 0,

		postCreate: function () {
			this.inherited(arguments);
			var self = this;
			// check visibility on scroll events
			on(this.bodyNode, 'scroll',
				miscUtil[this.pagingMethod](function (event) {
					self._processScroll(event);
				}, null, this.pagingDelay)
			);
		},

		destroy: function () {
			this.inherited(arguments);
			if (this._refreshTimeout) {
				clearTimeout(this._refreshTimeout);
			}
		},

		renderQuery: function (query, options) {
			// summary:
			//		Creates a preload node for rendering a query into, and executes the query
			//		for the first page of data. Subsequent data will be downloaded as it comes
			//		into view.
			// query: Function
			//		Function to be called when requesting new data.
			// options: Object?
			//		Optional object containing the following:
			//		* container: Container to build preload nodes within; defaults to this.contentNode

			var self = this,
				container = (options && options.container) || this.contentNode,
				preload = {
					query: query,
					count: 0
				},
				preloadNode,
				priorPreload = this.preload;

			// Initial query; set up top and bottom preload nodes
			var topPreload = {
				node: put(container, 'div.dgrid-preload', {
					rowIndex: 0
				}),
				count: 0,
				query: query,
				next: preload
			};
			topPreload.node.style.height = '0';
			preload.node = preloadNode = put(container, 'div.dgrid-preload');
			preload.previous = topPreload;

			// this preload node is used to represent the area of the grid that hasn't been
			// downloaded yet
			preloadNode.rowIndex = this.minRowsPerPage;

			if (priorPreload) {
				// the preload nodes (if there are multiple) are represented as a linked list, need to insert it
				if ((preload.next = priorPreload.next) &&
						// is this preload node below the prior preload node?
						preloadNode.offsetTop >= priorPreload.node.offsetTop) {
					// the prior preload is above/before in the linked list
					preload.previous = priorPreload;
				}
				else {
					// the prior preload is below/after in the linked list
					preload.next = priorPreload;
					preload.previous = priorPreload.previous;
				}
				// adjust the previous and next links so the linked list is proper
				preload.previous.next = preload;
				preload.next.previous = preload;
			}
			else {
				this.preload = preload;
			}

			var loadingNode = put(preloadNode, '-div.dgrid-loading'),
				innerNode = put(loadingNode, 'div.dgrid-below');
			innerNode.innerHTML = this.loadingMessage;

			// Establish query options, mixing in our own.
			options = lang.mixin({ start: 0, count: this.minRowsPerPage },
				'level' in query ? { queryLevel: query.level } : null);

			// Protect the query within a _trackError call, but return the resulting collection
			return this._trackError(function () {
				var results = query(options);

				// Render the result set
				return self.renderQueryResults(results, preloadNode, options).then(function (trs) {
					return results.totalLength.then(function (total) {
						var trCount = trs.length,
							parentNode = preloadNode.parentNode,
							noDataNode = self.noDataNode;

						if (self._rows) {
							self._rows.min = 0;
							self._rows.max = trCount === total ? Infinity : trCount - 1;
						}

						put(loadingNode, '!');
						if (!('queryLevel' in options)) {
							self._total = total;
						}
						// now we need to adjust the height and total count based on the first result set
						if (total === 0 && parentNode) {
							if (noDataNode) {
								put(noDataNode, '!');
								delete self.noDataNode;
							}
							self.noDataNode = noDataNode = put('div.dgrid-no-data');
							parentNode.insertBefore(noDataNode, self._getFirstRowSibling(parentNode));
							noDataNode.innerHTML = self.noDataMessage;
						}
						self._calcAverageRowHeight(trs);

						total -= trCount;
						preload.count = total;
						preloadNode.rowIndex = trCount;
						if (total) {
							preloadNode.style.height = Math.min(total * self.rowHeight, self.maxEmptySpace) + 'px';
						}
						else {
							preloadNode.style.display = 'none';
						}

						if (self._previousScrollPosition) {
							// Restore position after a refresh operation w/ keepScrollPosition
							self.scrollTo(self._previousScrollPosition);
							delete self._previousScrollPosition;
						}

						// Redo scroll processing in case the query didn't fill the screen,
						// or in case scroll position was restored
						return when(self._processScroll()).then(function () {
							return trs;
						});
					});
				}).otherwise(function (err) {
					// remove the loadingNode and re-throw
					put(loadingNode, '!');
					throw err;
				});
			});
		},

		refresh: function (options) {
			// summary:
			//		Refreshes the contents of the grid.
			// options: Object?
			//		Optional object, supporting the following parameters:
			//		* keepScrollPosition: like the keepScrollPosition instance property;
			//			specifying it in the options here will override the instance
			//			property's value for this specific refresh call only.

			var self = this,
				keep = (options && options.keepScrollPosition);

			// Fall back to instance property if option is not defined
			if (typeof keep === 'undefined') {
				keep = this.keepScrollPosition;
			}

			// Store scroll position to be restored after new total is received
			if (keep) {
				this._previousScrollPosition = this.getScrollPosition();
			}

			this.inherited(arguments);
			if (this._renderedCollection) {
				// render the query

				// renderQuery calls _trackError internally
				return this.renderQuery(function (queryOptions) {
					return self._renderedCollection.fetchRange({
						start: queryOptions.start,
						end: queryOptions.start + queryOptions.count
					});
				}).then(function () {
					// Emit on a separate turn to enable event to be used consistently for
					// initial render, regardless of whether the backing store is async
					self._refreshTimeout = setTimeout(function () {
						on.emit(self.domNode, 'dgrid-refresh-complete', {
							bubbles: true,
							cancelable: false,
							grid: self
						});
						self._refreshTimeout = null;
					}, 0);
				});
			}
		},

		resize: function () {
			this.inherited(arguments);
			if (!this.rowHeight) {
				this._calcAverageRowHeight(this.contentNode.getElementsByClassName('dgrid-row'));
			}
			this._processScroll();
		},

		cleanup: function () {
			this.inherited(arguments);
			this.preload = null;
		},

		renderQueryResults: function (results) {
			var rows = this.inherited(arguments);
			var collection = this._renderedCollection;

			if (collection && collection.releaseRange) {
				rows.then(function (resolvedRows) {
					if (resolvedRows[0] && !resolvedRows[0].parentNode.tagName) {
						// Release this range, since it was never actually rendered;
						// need to wait until totalLength promise resolves, since
						// Trackable only adds the range then to begin with
						results.totalLength.then(function () {
							collection.releaseRange(resolvedRows[0].rowIndex,
								resolvedRows[resolvedRows.length - 1].rowIndex + 1);
						});
					}
				});
			}

			return rows;
		},

		_getFirstRowSibling: function (container) {
			// summary:
			//		Returns the DOM node that a new row should be inserted before
			//		when there are no other rows in the current result set.
			//		In the case of OnDemandList, this will always be the last child
			//		of the container (which will be a trailing preload node).
			return container.lastChild;
		},

		_calcRowHeight: function (rowElement) {
			// summary:
			//		Calculate the height of a row. This is a method so it can be overriden for
			//		plugins that add connected elements to a row, like the tree

			var sibling = rowElement.nextSibling;

			// If a next row exists, compare the top of this row with the
			// next one (in case "rows" are actually rendering side-by-side).
			// If no next row exists, this is either the last or only row,
			// in which case we count its own height.
			if (sibling && !/\bdgrid-preload\b/.test(sibling.className)) {
				return sibling.offsetTop - rowElement.offsetTop;
			}

			return rowElement.offsetHeight;
		},

		_calcAverageRowHeight: function (rowElements) {
			// summary:
			//		Sets this.rowHeight based on the average from heights of the provided row elements.

			var count = rowElements.length;
			var height = 0;
			for (var i = 0; i < count; i++) {
				height += this._calcRowHeight(rowElements[i]);
			}
			// only update rowHeight if elements were passed and are in flow
			if (count && height) {
				this.rowHeight = height / count;
			}
		},

		lastScrollTop: 0,
		_processScroll: function (evt) {
			// summary:
			//		Checks to make sure that everything in the viewable area has been
			//		downloaded, and triggering a request for the necessary data when needed.

			if (!this.rowHeight) {
				return;
			}

			var grid = this,
				scrollNode = grid.bodyNode,
				// grab current visible top from event if provided, otherwise from node
				visibleTop = (evt && evt.scrollTop) || this.getScrollPosition().y,
				visibleBottom = scrollNode.offsetHeight + visibleTop,
				priorPreload, preloadNode, preload = grid.preload,
				lastScrollTop = grid.lastScrollTop,
				requestBuffer = grid.bufferRows * grid.rowHeight,
				searchBuffer = requestBuffer - grid.rowHeight, // Avoid rounding causing multiple queries
				// References related to emitting dgrid-refresh-complete if applicable
				lastRows,
				preloadSearchNext = true;

			// XXX: I do not know why this happens.
			// munging the actual location of the viewport relative to the preload node by a few pixels in either
			// direction is necessary because at least WebKit on Windows seems to have an error that causes it to
			// not quite get the entire element being focused in the viewport during keyboard navigation,
			// which means it becomes impossible to load more data using keyboard navigation because there is
			// no more data to scroll to to trigger the fetch.
			// 1 is arbitrary and just gets it to work correctly with our current test cases; don’t wanna go
			// crazy and set it to a big number without understanding more about what is going on.
			// wondering if it has to do with border-box or something, but changing the border widths does not
			// seem to make it break more or less, so I do not know…
			var mungeAmount = 1;

			grid.lastScrollTop = visibleTop;

			function removeDistantNodes(preload, distanceOff, traversal, below) {
				// we check to see the the nodes are "far off"
				var farOffRemoval = grid.farOffRemoval,
					preloadNode = preload.node;
				// by checking to see if it is the farOffRemoval distance away
				if (distanceOff > 2 * farOffRemoval) {
					// there is a preloadNode that is far off;
					// remove rows until we get to in the current viewport
					var row;
					var nextRow = preloadNode[traversal];
					var reclaimedHeight = 0;
					var count = 0;
					var toDelete = [];
					var firstRowIndex = nextRow && nextRow.rowIndex;
					var lastRowIndex;

					while ((row = nextRow)) {
						var rowHeight = grid._calcRowHeight(row);
						if (reclaimedHeight + rowHeight + farOffRemoval > distanceOff ||
								(nextRow.className.indexOf('dgrid-row') < 0 &&
									nextRow.className.indexOf('dgrid-loading') < 0)) {
							// we have reclaimed enough rows or we have gone beyond grid rows
							break;
						}

						nextRow = row[traversal];
						reclaimedHeight += rowHeight;
						count += row.count || 1;
						// Just do cleanup here, as we will do a more efficient node destruction in a setTimeout below
						grid.removeRow(row, true);
						toDelete.push(row);

						if ('rowIndex' in row) {
							lastRowIndex = row.rowIndex;
						}
					}

					if (grid._renderedCollection.releaseRange &&
							typeof firstRowIndex === 'number' && typeof lastRowIndex === 'number') {
						// Note that currently child rows in Tree structures are never unrendered;
						// this logic will need to be revisited when that is addressed.

						// releaseRange is end-exclusive, and won't remove anything if start >= end.
						if (below) {
							grid._renderedCollection.releaseRange(lastRowIndex, firstRowIndex + 1);
						}
						else {
							grid._renderedCollection.releaseRange(firstRowIndex, lastRowIndex + 1);
						}

						grid._rows[below ? 'max' : 'min'] = lastRowIndex;
						if (grid._rows.max >= grid._total - 1) {
							grid._rows.max = Infinity;
						}
					}
					// now adjust the preloadNode based on the reclaimed space
					preload.count += count;
					if (below) {
						preloadNode.rowIndex -= count;
						adjustHeight(preload);
					}
					else {
						// if it is above, we can calculate the change in exact row changes,
						// which we must do to not mess with the scroll position
						preloadNode.style.height = (preloadNode.offsetHeight + reclaimedHeight) + 'px';
					}
					// we remove the elements after expanding the preload node so that
					// the contraction doesn't alter the scroll position
					var trashBin = put('div', toDelete);
					setTimeout(function () {
						// we can defer the destruction until later
						put(trashBin, '!');
					}, 1);
				}
			}

			function adjustHeight(preload, noMax) {
				preload.node.style.height = Math.min(preload.count * grid.rowHeight,
					noMax ? Infinity : grid.maxEmptySpace) + 'px';
			}
			function traversePreload(preload, moveNext) {
				// Skip past preloads that are not currently connected
				do {
					preload = moveNext ? preload.next : preload.previous;
				} while (preload && !preload.node.offsetWidth);
				return preload;
			}
			while (preload && !preload.node.offsetWidth) {
				// skip past preloads that are not currently connected
				preload = preload.previous;
			}
			// there can be multiple preloadNodes (if they split, or multiple queries are created),
			//	so we can traverse them until we find whatever is in the current viewport, making
			//	sure we don't backtrack
			while (preload && preload !== priorPreload) {
				priorPreload = grid.preload;
				grid.preload = preload;
				preloadNode = preload.node;
				var preloadTop = preloadNode.offsetTop;
				var preloadHeight;

				if (visibleBottom + mungeAmount + searchBuffer < preloadTop) {
					// the preload is below the line of sight
					preload = traversePreload(preload, (preloadSearchNext = false));
				}
				else if (visibleTop - mungeAmount - searchBuffer >
						(preloadTop + (preloadHeight = preloadNode.offsetHeight))) {
					// the preload is above the line of sight
					preload = traversePreload(preload, (preloadSearchNext = true));
				}
				else {
					// the preload node is visible, or close to visible, better show it
					var offset = ((preloadNode.rowIndex ? visibleTop - requestBuffer :
						visibleBottom) - preloadTop) / grid.rowHeight;
					var count = (visibleBottom - visibleTop + 2 * requestBuffer) / grid.rowHeight;
					// utilize momentum for predictions
					var momentum = Math.max(
						Math.min((visibleTop - lastScrollTop) * grid.rowHeight, grid.maxRowsPerPage / 2),
						grid.maxRowsPerPage / -2);
					count += Math.min(Math.abs(momentum), 10);
					if (preloadNode.rowIndex === 0) {
						// at the top, adjust from bottom to top
						offset -= count;
					}
					offset = Math.max(offset, 0);
					if (offset < 10 && offset > 0 && count + offset < grid.maxRowsPerPage) {
						// connect to the top of the preloadNode if possible to avoid excessive adjustments
						count += Math.max(0, offset);
						offset = 0;
					}
					count = Math.min(Math.max(count, grid.minRowsPerPage),
										grid.maxRowsPerPage, preload.count);

					if (count === 0) {
						preload = traversePreload(preload, preloadSearchNext);
						continue;
					}

					count = Math.ceil(count);
					offset = Math.min(Math.floor(offset), preload.count - count);

					var options = {};
					preload.count -= count;
					var beforeNode = preloadNode,
						keepScrollTo, queryRowsOverlap = grid.queryRowsOverlap,
						below = (preloadNode.rowIndex > 0 || preloadNode.offsetTop > visibleTop) && preload;
					if (below) {
						// add new rows below
						var previous = preload.previous;
						if (previous) {
							removeDistantNodes(previous,
								visibleTop - (previous.node.offsetTop + previous.node.offsetHeight),
								'nextSibling');
							if (offset > 0 && previous.node === preloadNode.previousSibling) {
								// all of the nodes above were removed
								offset = Math.min(preload.count, offset);
								preload.previous.count += offset;
								adjustHeight(preload.previous, true);
								preloadNode.rowIndex += offset;
								queryRowsOverlap = 0;
							}
							else {
								count += offset;
							}
							preload.count -= offset;
						}
						options.start = preloadNode.rowIndex - queryRowsOverlap;
						options.count = Math.min(count + queryRowsOverlap, grid.maxRowsPerPage);
						preloadNode.rowIndex = options.start + options.count;
					}
					else {
						// add new rows above
						if (preload.next) {
							// remove out of sight nodes first
							removeDistantNodes(preload.next, preload.next.node.offsetTop - visibleBottom,
								'previousSibling', true);
							beforeNode = preloadNode.nextSibling;
							if (beforeNode === preload.next.node) {
								// all of the nodes were removed, can position wherever we want
								preload.next.count += preload.count - offset;
								preload.next.node.rowIndex = offset + count;
								adjustHeight(preload.next);
								preload.count = offset;
								queryRowsOverlap = 0;
							}
							else {
								keepScrollTo = true;
							}

						}
						options.start = preload.count;
						options.count = Math.min(count + queryRowsOverlap, grid.maxRowsPerPage);
					}
					if (keepScrollTo && beforeNode && beforeNode.offsetWidth) {
						keepScrollTo = beforeNode.offsetTop;
					}

					adjustHeight(preload);

					// use the query associated with the preload node to get the next "page"
					if ('level' in preload.query) {
						options.queryLevel = preload.query.level;
					}

					// Avoid spurious queries (ideally this should be unnecessary...)
					if (!('queryLevel' in options) && (options.start > grid._total || options.count < 0)) {
						continue;
					}

					// create a loading node as a placeholder while the data is loaded
					var loadingNode = put(beforeNode,
						'-div.dgrid-loading[style=height:' + count * grid.rowHeight + 'px]');
					var innerNode = put(loadingNode, 'div.dgrid-' + (below ? 'below' : 'above'));
					innerNode.innerHTML = grid.loadingMessage;
					loadingNode.count = count;

					// Query now to fill in these rows.
					grid._trackError(function () {
						// Use function to isolate the variables in case we make multiple requests
						// (which can happen if we need to render on both sides of an island of already-rendered rows)
						(function (loadingNode, below, keepScrollTo) {
							/* jshint maxlen: 122 */
							var rangeResults = preload.query(options);
							lastRows = grid.renderQueryResults(rangeResults, loadingNode, options).then(function (rows) {
								var gridRows = grid._rows;
								if (gridRows && !('queryLevel' in options) && rows.length) {
									// Update relevant observed range for top-level items
									if (below) {
										if (gridRows.max <= gridRows.min) {
											// All rows were removed; update start of rendered range as well
											gridRows.min = rows[0].rowIndex;
										}
										gridRows.max = rows[rows.length - 1].rowIndex;
									}
									else {
										if (gridRows.max <= gridRows.min) {
											// All rows were removed; update end of rendered range as well
											gridRows.max = rows[rows.length - 1].rowIndex;
										}
										gridRows.min = rows[0].rowIndex;
									}
								}

								// can remove the loading node now
								beforeNode = loadingNode.nextSibling;
								put(loadingNode, '!');
								// beforeNode may have been removed if the query results loading node was removed
								// as a distant node before rendering
								if (keepScrollTo && beforeNode && beforeNode.offsetWidth) {
									// if the preload area above the nodes is approximated based on average
									// row height, we may need to adjust the scroll once they are filled in
									// so we don't "jump" in the scrolling position
									var pos = grid.getScrollPosition();
									grid.scrollTo({
										// Since we already had to query the scroll position,
										// include x to avoid TouchScroll querying it again on its end.
										x: pos.x,
										y: pos.y + beforeNode.offsetTop - keepScrollTo,
										// Don't kill momentum mid-scroll (for TouchScroll only).
										preserveMomentum: true
									});
								}

								rangeResults.totalLength.then(function (total) {
									if (!('queryLevel' in options)) {
										grid._total = total;
										if (grid._rows && grid._rows.max >= grid._total - 1) {
											grid._rows.max = Infinity;
										}
									}
									if (below) {
										// if it is below, we will use the total from the collection to update
										// the count of the last preload in case the total changes as
										// later pages are retrieved

										// recalculate the count
										below.count = total - below.node.rowIndex;
										// readjust the height
										adjustHeight(below);
									}
								});

								// make sure we have covered the visible area
								grid._processScroll();
								return rows;
							}, function (e) {
								put(loadingNode, '!');
								throw e;
							});
						})(loadingNode, below, keepScrollTo);
					});

					preload = preload.previous;

				}
			}

			// return the promise from the last render
			return lastRows;
		}
	});

});

/**
 * @external dgrid/OnDemandList
 * @see https://github.com/SitePen/dgrid/blob/dev-0.4/doc/components/core-components/OnDemandList-and-OnDemandGrid.md
 */

/**
 * @module
 * @class OnDemandContentGroups
 * @extends dgrid/OnDemandList
 * This module extends OnDemandList and prpvides additional support for Content Groups
 *
 * This module is automatically mixed into the dgrid instance
 * created in TableBase.factory for virtual tables
 */
define('hui/table/OnDemandContentGroups',[
    'dojo/_base/declare',
    'dojo/on',
    'dgrid/Grid',
    'dgrid/OnDemandList',
    './ContentGroups'
], function(declare, on, Grid, OnDemandList, ContentGroups) {
    OnDemandList.extend({
        /**
         * Renders divs indicating that no data was available
         * under any expanded groups that have no children.
         * @private
         */
        _renderNoDataDivs: function() {
            var grid = this;
            Array.prototype.map.call(grid.contentNode.getElementsByClassName('category-row'), function(element) {
                return grid.row(element);
            }).forEach(function(row) {
                if (row && grid._expanded[grid.collection.getIdentity(row.data)] &&
                    (row.element.nextSibling.classList.contains('dgrid-preload') ||
                    row.element.nextSibling.classList.contains('category-row'))) {
                    var noDataDiv = document.createElement('div');
                    noDataDiv.classList.add('ha-table-no-data');
                    noDataDiv.textContent = 'No Data Available';

                    row.element.parentNode.insertBefore(noDataDiv, row.element.nextSibling);
                }
            });
        },

        /**
         * Refreshes the grid and renders the appropriate data
         * @param {Object} options - Optional object, supporting the following parameters:
         *  keepScrollPosition: like the keepScrollPosition instance property;
         *  specifying it in the options here will override the instance
         *  property's value for this specific refresh call only.
         * @returns {*}
         */
        refresh: function(options) {
            var self = this,
                keep = (options && options.keepScrollPosition),
                expanded = self._getExpanded();

            // Fall back to instance property if option is not defined
            if (typeof keep === 'undefined') {
                keep = this.keepScrollPosition;
            }

            // Store scroll position to be restored after new total is received
            if (keep && (!this.categoryProperty || expanded.length > 0)) {
                this._previousScrollPosition = this.getScrollPosition();
            }

            this.inherited(arguments);
            if (this._renderedCollection) {
                // render the query

                // renderQuery calls _trackError internally
                return this.renderQuery(function(queryOptions) {
                    if (self._renderedCollection.fetchGroupRange &&
                        Math.abs((queryOptions.start + queryOptions.count) -
                            (self._total ? self._total : 0)) < Object.keys(self._expanded).length) {
                        queryOptions.count += Object.keys(self._expanded).length;
                    }
                    return self._renderedCollection.fetchGroupRange ? self._renderedCollection.fetchGroupRange({
                        start: queryOptions.start,
                        end: queryOptions.start + queryOptions.count,
                        expanded: expanded,
                        virtual: true
                    }) : self._renderedCollection.fetchRange({
                        start: queryOptions.start,
                        end: queryOptions.start + queryOptions.count
                    });
                }).then(function() {
                    // Emit on a separate turn to enable event to be used consistently for
                    // initial render, regardless of whether the backing store is async
                    setTimeout(function() {
                        self._renderNoDataDivs();
                        on.emit(self.domNode, 'dgrid-refresh-complete', {
                            bubbles: true,
                            cancelable: false,
                            grid: self
                        });
                    }, 0);
                });
            }
        }
    });

    /**
     * Extends onDemandList to support content groups
     */
    return declare([Grid, OnDemandList, ContentGroups], {
        /**
         * Handles a scroll event and renders divs indicating that groups
         * have no children.
         * @private
         */
        _processScroll: /* istanbul ignore next */ function() {
            var result;

            if (!this.categoryProperty || this._getExpanded().length > 0) {
                // The scroll event handler may result in rows being added/removed (by OnDemandList), which will
                // result in 'table#_adjustHeight/_calculateInitialHeight' being called and resizing the table.
                // On-the-fly resizing should *not* happen while the user is actively scrolling, so the
                // '_isProcessingScroll' flag is set to prevent that.
                // What happens without this logic: ha-table-virtual will frequently resize during manual scrolling (if
                // the table's collection is an async store).
                this._isProcessingScroll = true;
                result = this.inherited(arguments);

                if (result) {
                    result.then(function() {
                        this._isProcessingScroll = false;
                    });
                } else {
                    setTimeout(function() {
                        this._isProcessingScroll = false;
                    }, /* TODO: tweak value?? */ 100);
                }
            }

            this._renderNoDataDivs();
            this._applyA11yRoles();

            return result;
        }
    });
});


define('dgrid-0.4/extensions/ColumnResizer',[
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/on',
	'dojo/query',
	'dojo/_base/lang',
	'dojo/dom',
	'dojo/dom-geometry',
	'dojo/has',
	'../util/misc',
	'put-selector/put',
	'dojo/_base/html',
	'xstyle/css!../css/extensions/ColumnResizer.css'
], function (declare, arrayUtil, listen, query, lang, dom, geom, has, miscUtil, put) {

	function addRowSpan(table, span, startRow, column, id) {
		// loop through the rows of the table and add this column's id to
		// the rows' column
		for (var i = 1; i < span; i++) {
			table[startRow + i][column] = id;
		}
	}
	function subRowAssoc(subRows) {
		// Take a sub-row structure and output an object with key=>value pairs
		// The keys will be the column id's; the values will be the first-row column
		// that column's resizer should be associated with.

		var i = subRows.length,
			l = i,
			numCols = arrayUtil.filter(subRows[0], function (column) {
				return !column.hidden;
			}).length,
			table = new Array(i);

		// create table-like structure in an array so it can be populated
		// with row-spans and col-spans
		while (i--) {
			table[i] = new Array(numCols);
		}

		var associations = {};

		for (i = 0; i < l; i++) {
			var row = table[i],
				subRow = subRows[i];

			// j: counter for table columns
			// js: counter for subrow structure columns
			for (var j = 0, js = 0; j < numCols; j++) {
				var cell = subRow[js], k;

				// if something already exists in the table (row-span), skip this
				// spot and go to the next
				if (typeof row[j] !== 'undefined') {
					continue;
				}
				row[j] = cell.id;

				if (cell.rowSpan && cell.rowSpan > 1) {
					addRowSpan(table, cell.rowSpan, i, j, cell.id);
				}

				// colSpans are only applicable in the second or greater rows
				// and only if the colSpan is greater than 1
				if (i > 0 && cell.colSpan && cell.colSpan > 1) {
					for (k = 1; k < cell.colSpan; k++) {
						// increment j and assign the id since this is a span
						row[++j] = cell.id;
						if (cell.rowSpan && cell.rowSpan > 1) {
							addRowSpan(table, cell.rowSpan, i, j, cell.id);
						}
					}
				}
				associations[cell.id] = subRows[0][j].id;
				js++;
			}
		}

		return associations;
	}

	function resizeColumnWidth(grid, colId, width, parentType, doResize) {
		// don't react to widths <= 0, e.g. for hidden columns
		if (width <= 0) {
			return;
		}

		var column = grid.columns[colId],
			event,
			rule;

		if (!column) {
			return;
		}

		event = {
			grid: grid,
			columnId: colId,
			width: width,
			bubbles: true,
			cancelable: true
		};

		if (parentType) {
			event.parentType = parentType;
		}

		if (!grid._resizedColumns || listen.emit(grid.headerNode, 'dgrid-columnresize', event)) {
			// Update width on column object, then convert value for CSS
			if (width === 'auto') {
				delete column.width;
			}
			else {
				column.width = width;
				width += 'px';
			}

			rule = grid._columnSizes[colId];

			if (rule) {
				// Modify existing, rather than deleting + adding
				rule.set('width', width);
			}
			else {
				// Use miscUtil function directly, since we clean these up ourselves anyway
				rule = miscUtil.addCssRule('#' + miscUtil.escapeCssIdentifier(grid.domNode.id) +
					' .dgrid-column-' + miscUtil.escapeCssIdentifier(colId, '-'),
					'width: ' + width + ';');
			}

			// keep a reference for future removal
			grid._columnSizes[colId] = rule;

			if (doResize !== false) {
				grid.resize();
			}

			return true;
		}
	}

	// Functions for shared resizer node

	var resizerNode, // DOM node for resize indicator, reused between instances
		resizerGuardNode, // DOM node to guard against clicks registering on header cells (and inducing sort)
		resizableCount = 0; // Number of ColumnResizer-enabled grid instances
	var resizer = {
		// This object contains functions for manipulating the shared resizerNode
		create: function () {
			resizerNode = put('div.dgrid-column-resizer');
			resizerGuardNode = put('div.dgrid-resize-guard');
		},
		destroy: function () {
			put(resizerNode, '!');
			put(resizerGuardNode, '!');
			resizerNode = resizerGuardNode = null;
		},
		show: function (grid) {
			var pos = geom.position(grid.domNode, true);
			resizerNode.style.top = pos.y + 'px';
			resizerNode.style.height = pos.h + 'px';
			put(document.body, resizerNode);
			put(grid.domNode, resizerGuardNode);
		},
		move: function (x) {
			resizerNode.style.left = x + 'px';
		},
		hide: function () {
			resizerNode.parentNode.removeChild(resizerNode);
			resizerGuardNode.parentNode.removeChild(resizerGuardNode);
		}
	};

	return declare(null, {
		resizeNode: null,

		// minWidth: Number
		//		Minimum column width, in px.
		minWidth: 40,

		// adjustLastColumn: Boolean
		//		If true, adjusts the last column's width to "auto" at times where the
		//		browser would otherwise stretch all columns to span the grid.
		adjustLastColumn: true,

		_resizedColumns: false, // flag indicating if resizer has converted column widths to px

		buildRendering: function () {
			this.inherited(arguments);

			// Create resizerNode when first grid w/ ColumnResizer is created
			if (!resizableCount) {
				resizer.create();
			}
			resizableCount++;
		},

		destroy: function () {
			this.inherited(arguments);

			// Remove any applied column size styles since we're tracking them directly
			for (var name in this._columnSizes) {
				this._columnSizes[name].remove();
			}

			// If this is the last grid on the page with ColumnResizer, destroy the
			// shared resizerNode
			if (!--resizableCount) {
				resizer.destroy();
			}
		},

		resizeColumnWidth: function (colId, width) {
			// Summary:
			//      calls grid's styleColumn function to add a style for the column
			// colId: String
			//      column id
			// width: Integer
			//      new width of the column
			return resizeColumnWidth(this, colId, width);
		},

		configStructure: function () {
			var oldSizes = this._oldColumnSizes = lang.mixin({}, this._columnSizes), // shallow clone
				k;

			this._resizedColumns = false;
			this._columnSizes = {};

			this.inherited(arguments);

			// Remove old column styles that are no longer relevant; this is specifically
			// done *after* calling inherited so that _columnSizes will contain keys
			// for all columns in the new structure that were assigned widths.
			for (k in oldSizes) {
				if (!(k in this._columnSizes)) {
					oldSizes[k].remove();
				}
			}
			delete this._oldColumnSizes;
		},

		_configColumn: function (column) {
			this.inherited(arguments);

			var colId = column.id,
				rule;

			if ('width' in column) {
				// Update or add a style rule for the specified width
				if ((rule = this._oldColumnSizes[colId])) {
					rule.set('width', column.width + 'px');
				}
				else {
					rule = miscUtil.addCssRule('#' + miscUtil.escapeCssIdentifier(this.domNode.id) +
						' .dgrid-column-' + miscUtil.escapeCssIdentifier(colId, '-'),
						'width: ' + column.width + 'px;');
				}
				this._columnSizes[colId] = rule;
			}
		},

		renderHeader: function () {
			this.inherited(arguments);

			var grid = this;

			var assoc;
			if (this.columnSets && this.columnSets.length) {
				var csi = this.columnSets.length;
				while (csi--) {
					assoc = lang.mixin(assoc || {}, subRowAssoc(this.columnSets[csi]));
				}
			}
			else if (this.subRows && this.subRows.length > 1) {
				assoc = subRowAssoc(this.subRows);
			}

			var colNodes = query('.dgrid-cell', grid.headerNode),
				i = colNodes.length;
			while (i--) {
				var colNode = colNodes[i],
					id = colNode.columnId,
					col = grid.columns[id],
					childNodes = colNode.childNodes,
					resizeHandle;

				if (!col || col.resizable === false) {
					continue;
				}

				var headerTextNode = put('div.dgrid-resize-header-container');
				colNode.contents = headerTextNode;

				// move all the children to the header text node
				while (childNodes.length > 0) {
					put(headerTextNode, childNodes[0]);
				}

				resizeHandle = put(colNode, headerTextNode, 'div.dgrid-resize-handle.resizeNode-' +
					miscUtil.escapeCssIdentifier(id, '-'));
				resizeHandle.columnId = assoc && assoc[id] || id;
			}

			if (!grid.mouseMoveListen) {
				// establish listeners for initiating, dragging, and finishing resize
				listen(grid.headerNode,
					'.dgrid-resize-handle:mousedown' +
						(has('touch') ? ',.dgrid-resize-handle:touchstart' : ''),
					function (e) {
						grid._resizeMouseDown(e, this);
						grid.mouseMoveListen.resume();
						grid.mouseUpListen.resume();
					}
				);
				grid._listeners.push(grid.mouseMoveListen =
					listen.pausable(document,
						'mousemove' + (has('touch') ? ',touchmove' : ''),
						miscUtil.throttleDelayed(function (e) {
							grid._updateResizerPosition(e);
						})
				));
				grid._listeners.push(grid.mouseUpListen = listen.pausable(document,
					'mouseup' + (has('touch') ? ',touchend' : ''),
					function (e) {
						grid._resizeMouseUp(e);
						grid.mouseMoveListen.pause();
						grid.mouseUpListen.pause();
					}
				));
				// initially pause the move/up listeners until a drag happens
				grid.mouseMoveListen.pause();
				grid.mouseUpListen.pause();
			}
		}, // end renderHeader

		_resizeMouseDown: function (e, target) {
			// Summary:
			//      called when mouse button is pressed on the header
			// e: Object
			//      mousedown event object

			// preventDefault actually seems to be enough to prevent browser selection
			// in all but IE < 9.  setSelectable works for those.
			e.preventDefault();
			dom.setSelectable(this.domNode, false);

			this._startX = this._getResizeMouseLocation(e); //position of the target

			this._targetCell = query('.dgrid-column-' + miscUtil.escapeCssIdentifier(target.columnId, '-'),
				this.headerNode)[0];

			// Show resizerNode after initializing its x position
			this._updateResizerPosition(e);
			resizer.show(this);
		},
		_resizeMouseUp: function (e) {
			// Summary:
			//      called when mouse button is released
			// e: Object
			//      mouseup event object

			var columnSizes = this._columnSizes,
				colNodes, colWidths, gridWidth;

			if (this.adjustLastColumn) {
				// For some reason, total column width needs to be 1 less than this
				gridWidth = this.headerNode.clientWidth - 1;
			}

			//This is used to set all the column widths to a static size
			if (!this._resizedColumns) {
				colNodes = query('.dgrid-cell', this.headerNode);

				if (this.columnSets && this.columnSets.length) {
					colNodes = colNodes.filter(function (node) {
						var idx = node.columnId.split('-');
						return idx[0] === '0' && !(node.columnId in columnSizes);
					});
				}
				else if (this.subRows && this.subRows.length > 1) {
					colNodes = colNodes.filter(function (node) {
						return node.columnId.charAt(0) === '0' && !(node.columnId in columnSizes);
					});
				}

				// Get a set of sizes before we start mutating, to avoid
				// weird disproportionate measures if the grid has set
				// column widths, but no full grid width set
				colWidths = colNodes.map(function (colNode) {
					return colNode.offsetWidth;
				});

				// Set a baseline size for each column based on
				// its original measure
				colNodes.forEach(function (colNode, i) {
					resizeColumnWidth(this, colNode.columnId, colWidths[i], null, false);
				}, this);

				this._resizedColumns = true;
			}
			dom.setSelectable(this.domNode, true);

			var cell = this._targetCell,
				delta = this._getResizeMouseLocation(e) - this._startX, //final change in position of resizer
				newWidth = cell.offsetWidth + delta, //the new width after resize
				obj = this._getResizedColumnWidths(),//get current total column widths before resize
				totalWidth = obj.totalWidth,
				lastCol = obj.lastColId,
				lastColWidth = query('.dgrid-column-' + miscUtil.escapeCssIdentifier(lastCol, '-'),
					this.headerNode)[0].offsetWidth;

			if (newWidth < this.minWidth) {
				//enforce minimum widths
				newWidth = this.minWidth;
			}

			if (resizeColumnWidth(this, cell.columnId, newWidth, e.type)) {
				if (cell.columnId !== lastCol && this.adjustLastColumn) {
					if (totalWidth + delta < gridWidth) {
						//need to set last column's width to auto
						resizeColumnWidth(this, lastCol, 'auto', e.type);
					}
					else if (lastColWidth - delta <= this.minWidth) {
						//change last col width back to px, unless it is the last column itself being resized...
						resizeColumnWidth(this, lastCol, this.minWidth, e.type);
					}
				}
			}
			resizer.hide();

			// Clean up after the resize operation
			delete this._startX;
			delete this._targetCell;
		},

		_updateResizerPosition: function (e) {
			// Summary:
			//      updates position of resizer bar as mouse moves
			// e: Object
			//      mousemove event object

			if (!this._targetCell) {
				return; // Release event was already processed
			}

			var mousePos = this._getResizeMouseLocation(e),
				delta = mousePos - this._startX, //change from where user clicked to where they drag
				width = this._targetCell.offsetWidth,
				left = mousePos;
			if (width + delta < this.minWidth) {
				left = this._startX - (width - this.minWidth);
			}
			resizer.move(left);
		},

		_getResizeMouseLocation: function (e) {
			//Summary:
			//      returns position of mouse relative to the left edge
			// e: event object
			//      mouse move event object
			var posX = 0;
			if (e.pageX) {
				posX = e.pageX;
			}
			else if (e.clientX) {
				posX = e.clientX + document.body.scrollLeft +
					document.documentElement.scrollLeft;
			}
			return posX;
		},
		_getResizedColumnWidths: function () {
			//Summary:
			//      returns object containing new column width and column id
			var totalWidth = 0,
				colNodes = query(
					(this.columnSets ? '.dgrid-column-set-cell ' : '') + 'tr:first-child .dgrid-cell',
					this.headerNode);

			var i = colNodes.length;
			if (!i) {
				return {};
			}

			var lastColId = colNodes[i - 1].columnId;

			while (i--) {
				totalWidth += colNodes[i].offsetWidth;
			}
			return {totalWidth: totalWidth, lastColId: lastColId};
		}
	});
});



define('dgrid-0.4/extensions/ColumnHider',[
	'dojo/_base/declare',
	'dojo/has',
	'dojo/on',
	'../util/misc',
	'put-selector/put',
	'dojo/i18n!./nls/columnHider',
	'xstyle/css!../css/extensions/ColumnHider.css'
], function (declare, has, listen, miscUtil, put, i18n) {
/*
 *	Column Hider plugin for dgrid
 *	Originally contributed by TRT 2011-09-28
 *
 *	A dGrid plugin that attaches a menu to a dgrid, along with a way of opening it,
 *	that will allow you to show and hide columns.  A few caveats:
 *
 *	1. Menu placement is entirely based on CSS definitions.
 *	2. If you want columns initially hidden, you must add "hidden: true" to your
 *		column definition.
 *	3. This implementation does NOT support ColumnSet, and has not been tested
 *		with multi-subrow records.
 *	4. Column show/hide is controlled via straight up HTML checkboxes.  If you
 *		are looking for something more fancy, you'll probably need to use this
 *		definition as a template to write your own plugin.
 *
 */

	var activeGrid, // references grid for which the menu is currently open
		bodyListener; // references pausable event handler for body mousedown

	function getColumnIdFromCheckbox(cb, grid) {
		// Given one of the checkboxes from the hider menu,
		// return the id of the corresponding column.
		// (e.g. gridIDhere-hider-menu-check-colIDhere -> colIDhere)
		return cb.id.substr(grid.id.length + 18);
	}

	return declare(null, {
		// hiderMenuNode: DOMNode
		//		The node for the menu to show/hide columns.
		hiderMenuNode: null,

		// hiderToggleNode: DOMNode
		//		The node for the toggler to open the menu.
		hiderToggleNode: null,

		// i18nColumnHider: Object
		//		This object contains all of the internationalized strings for
		//		the ColumnHider extension as key/value pairs.
		i18nColumnHider: i18n,

		// _hiderMenuOpened: Boolean
		//		Records the current open/closed state of the menu.
		_hiderMenuOpened: false,

		// _columnHiderRules: Object
		//		Hash containing handles returned from addCssRule.
		_columnHiderRules: null,

		// _columnHiderCheckboxes: Object
		//		Hash containing checkboxes generated for menu items.
		_columnHiderCheckboxes: null,

		_renderHiderMenuEntries: function () {
			// summary:
			//		Iterates over subRows for the sake of adding items to the
			//		column hider menu.

			var subRows = this.subRows,
				first = true,
				srLength, cLength, sr, c;

			delete this._columnHiderFirstCheckbox;

			for (sr = 0, srLength = subRows.length; sr < srLength; sr++) {
				for (c = 0, cLength = subRows[sr].length; c < cLength; c++) {
					this._renderHiderMenuEntry(subRows[sr][c]);
					if (first) {
						first = false;
						this._columnHiderFirstCheckbox =
							this._columnHiderCheckboxes[subRows[sr][c].id];
					}
				}
			}
		},

		_renderHiderMenuEntry: function (col) {
			var id = col.id,
				replacedId = miscUtil.escapeCssIdentifier(id, '-'),
				div,
				checkId,
				checkbox,
				label;

			if (col.hidden) {
				// Hide the column (reset first to avoid short-circuiting logic)
				col.hidden = false;
				this._hideColumn(id);
				col.hidden = true;
			}

			// Allow cols to opt out of the hider (e.g. for selector column).
			if (col.unhidable) {
				return;
			}

			// Create the checkbox and label for each column selector.
			div = put('div.dgrid-hider-menu-row');
			checkId = this.domNode.id + '-hider-menu-check-' + replacedId;

			// put-selector can't handle invalid selector characters, and the
			// ID could have some, so add it directly
			checkbox = this._columnHiderCheckboxes[id] =
				put(div, 'input.dgrid-hider-menu-check.hider-menu-check-' + replacedId + '[type=checkbox]');
			checkbox.id = checkId;

			label = put(div, 'label.dgrid-hider-menu-label.hider-menu-label-' + replacedId +
				'[for=' + checkId + ']',
				col.label || col.field || '');

			put(this.hiderMenuNode, div);

			if (!col.hidden) {
				// Hidden state is false; checkbox should be initially checked.
				// (Need to do this after adding to DOM to avoid IE6 clobbering it.)
				checkbox.checked = true;
			}
		},

		renderHeader: function () {
			var grid = this,
				hiderMenuNode = this.hiderMenuNode,
				hiderToggleNode = this.hiderToggleNode,
				id;

			function stopPropagation(event) {
				event.stopPropagation();
			}

			this.inherited(arguments);

			if (!hiderMenuNode) {
				// First run
				// Assume that if this plugin is used, then columns are hidable.
				// Create the toggle node.
				hiderToggleNode = this.hiderToggleNode =
					put(this.domNode, 'button.ui-icon.dgrid-hider-toggle[type=button][aria-label=' +
						this.i18nColumnHider.popupTriggerLabel + ']');

				this._listeners.push(listen(hiderToggleNode, 'click', function (e) {
					grid._toggleColumnHiderMenu(e);
				}));

				// Create the column list, with checkboxes.
				hiderMenuNode = this.hiderMenuNode =
					put('div.dgrid-hider-menu[role=dialog][aria-label=' +
						this.i18nColumnHider.popupLabel + ']');
				hiderMenuNode.id = this.id + '-hider-menu';

				this._listeners.push(listen(hiderMenuNode, 'keyup', function (e) {
					var charOrCode = e.charCode || e.keyCode;
					if (charOrCode === /*ESCAPE*/ 27) {
						grid._toggleColumnHiderMenu(e);
						hiderToggleNode.focus();
					}
				}));

				// Make sure our menu is initially hidden, then attach to the document.
				hiderMenuNode.style.display = 'none';
				put(this.domNode, hiderMenuNode);

				// Hook up delegated listener for modifications to checkboxes.
				this._listeners.push(listen(hiderMenuNode,
						'.dgrid-hider-menu-check:' + (has('ie') < 9 ? 'click' : 'change'),
					function (e) {
						grid._updateColumnHiddenState(
							getColumnIdFromCheckbox(e.target, grid), !e.target.checked);
					}
				));

				// Stop click events from propagating from menu or trigger nodes,
				// so that we can simply track body clicks for hide without
				// having to drill-up to check.
				this._listeners.push(
					listen(hiderMenuNode, 'mousedown', stopPropagation),
					listen(hiderToggleNode, 'mousedown', stopPropagation)
				);

				// Hook up top-level mousedown listener if it hasn't been yet.
				if (!bodyListener) {
					bodyListener = listen.pausable(document, 'mousedown', function (e) {
						// If an event reaches this listener, the menu is open,
						// but a click occurred outside, so close the dropdown.
						activeGrid && activeGrid._toggleColumnHiderMenu(e);
					});
					bodyListener.pause(); // pause initially; will resume when menu opens
				}
			}
			else { // subsequent run
				// Remove active rules, and clear out the menu (to be repopulated).
				for (id in this._columnHiderRules) {
					this._columnHiderRules[id].remove();
				}
				hiderMenuNode.innerHTML = '';
			}

			this._columnHiderCheckboxes = {};
			this._columnHiderRules = {};

			// Populate menu with checkboxes/labels based on current columns.
			this._renderHiderMenuEntries();
		},

		destroy: function () {
			this.inherited(arguments);
			// Remove any remaining rules applied to hidden columns.
			for (var id in this._columnHiderRules) {
				this._columnHiderRules[id].remove();
			}
		},

		left: function (cell, steps) {
			return this.right(cell, -steps);
		},

		right: function (cell, steps) {
			if (!cell.element) {
				cell = this.cell(cell);
			}
			var nextCell = this.inherited(arguments),
				prevCell = cell;

			// Skip over hidden cells
			while (nextCell.column.hidden) {
				nextCell = this.inherited(arguments, [nextCell, steps > 0 ? 1 : -1]);
				if (prevCell.element === nextCell.element) {
					// No further visible cell found - return original
					return cell;
				}
				prevCell = nextCell;
			}
			return nextCell;
		},

		isColumnHidden: function (id) {
			// summary:
			//		Convenience method to determine current hidden state of a column
			return !!this._columnHiderRules[id];
		},

		_toggleColumnHiderMenu: function () {
			var hidden = this._hiderMenuOpened, // reflects hidden state after toggle
				hiderMenuNode = this.hiderMenuNode,
				domNode = this.domNode,
				firstCheckbox;

			// Show or hide the hider menu
			hiderMenuNode.style.display = (hidden ? 'none' : '');

			// Adjust height of menu
			if (hidden) {
				// Clear the set size
				hiderMenuNode.style.height = '';
			}
			else {
				// Adjust height of the menu if necessary
				// Why 12? Based on menu default paddings and border, we need
				// to adjust to be 12 pixels shorter. Given the infrequency of
				// this style changing, we're assuming it will remain this
				// static value of 12 for now, to avoid pulling in any sort of
				// computed styles.
				if (hiderMenuNode.offsetHeight > domNode.offsetHeight - 12) {
					hiderMenuNode.style.height = (domNode.offsetHeight - 12) + 'px';
				}
				// focus on the first checkbox
				(firstCheckbox = this._columnHiderFirstCheckbox) && firstCheckbox.focus();
			}

			// Pause or resume the listener for clicks outside the menu
			bodyListener[hidden ? 'pause' : 'resume']();

			// Update activeGrid appropriately
			activeGrid = hidden ? null : this;

			// Toggle the instance property
			this._hiderMenuOpened = !hidden;
		},

		_hideColumn: function (id) {
			// summary:
			//		Hides the column indicated by the given id.

			// Use miscUtil function directly, since we clean these up ourselves anyway
			var grid = this,
				selectorPrefix = '#' + miscUtil.escapeCssIdentifier(this.domNode.id) + ' .dgrid-column-',
				tableRule; // used in IE8 code path

			if (this._columnHiderRules[id]) {
				return;
			}

			this._columnHiderRules[id] =
				miscUtil.addCssRule(selectorPrefix + miscUtil.escapeCssIdentifier(id, '-'),
					'display: none;');

			if (has('ie') === 8 || has('ie') === 10) {
				// Work around IE8 display issue and IE10 issue where
				// header/body cells get out of sync when ColumnResizer is also used
				tableRule = miscUtil.addCssRule('.dgrid-row-table', 'display: inline-table;');

				window.setTimeout(function () {
					tableRule.remove();
					grid.resize();
				}, 0);
			}
		},

		_showColumn: function (id) {
			// summary:
			//		Shows the column indicated by the given id
			//		(by removing the rule responsible for hiding it).

			if (this._columnHiderRules[id]) {
				this._columnHiderRules[id].remove();
				delete this._columnHiderRules[id];
			}
		},

		_updateColumnHiddenState: function (id, hidden) {
			// summary:
			//		Performs internal work for toggleColumnHiddenState; see the public
			//		method for more information.

			this[hidden ? '_hideColumn' : '_showColumn'](id);

			// Update hidden state in actual column definition,
			// in case columns are re-rendered.
			this.columns[id].hidden = hidden;

			// Emit event to notify of column state change.
			listen.emit(this.domNode, 'dgrid-columnstatechange', {
				grid: this,
				column: this.columns[id],
				hidden: hidden,
				bubbles: true
			});

			// Adjust the size of the header.
			this.resize();
		},

		toggleColumnHiddenState: function (id, hidden) {
			// summary:
			//		Shows or hides the column with the given id.
			// id: String
			//		ID of column to show/hide.
			// hide: Boolean?
			//		If specified, explicitly sets the hidden state of the specified
			//		column.  If unspecified, toggles the column from the current state.

			if (typeof hidden === 'undefined') {
				hidden = !this._columnHiderRules[id];
			}
			this._updateColumnHiddenState(id, hidden);

			// Since this can be called directly, re-sync the appropriate checkbox.
			if (this._columnHiderCheckboxes[id]) {
				this._columnHiderCheckboxes[id].checked = !hidden;
			}
		}
	});
});

/**
 * @external dgrid/extensions/ColumnHider
 * @see https://github.com/SitePen/dgrid/blob/dev-0.4/doc/components/extensions/ColumnHider.md
 */

/**
 * @module
 * @class ColumnHider
 * @extends dgird/extensions/ColumnHider
 * This module overrides the built in ColumnHider funcitonality in dgrid to
 * allow for the creation of our own custom menu which exists in the tablebar
 * instead of existing in the grid column headers
 * This module is automatically mixed into the dgrid instance
 * created in TableBase.factory
 */
define('hui/table/ColumnHider',[
    'dgrid/extensions/ColumnHider'
], function(ColumnHider) {
    ColumnHider.extend({
        postMixInProperties: function() {
            this.inherited(arguments);
            this._columnHiderRules = {};
        },
        /**
         * Prevent the default header method provided by this plugin
         * from running and skip to the next one
         * @override
         */
        renderHeader: function() {
            this._columnHiderCheckboxes = {};
            this._columnHiderRules = {};
            this.inherited(arguments);
        },

        /**
         * Shows or hides the column with the given id
         * This function can be safely removed when upgrading to dgrid 0.4.1+
         * @param {string} id - ID of column to show/hide
         * @param {boolean} hidden - If specified, explicitly sets the hidden state of the specified column. If unspecified, toggles the column from the current state. See issue #1124
         */
        toggleColumnHiddenState: function(id, hidden) {
            if (typeof hidden === 'undefined') {
                hidden = !this._columnHiderRules[id];
            }
            this._updateColumnHiddenState(id, hidden);

            // Since this can be called directly, re-sync the appropriate checkbox.
            if (this._columnHiderCheckboxes[id]) {
                this._columnHiderCheckboxes[id].checked = !hidden;
            }
        }
    });

    return ColumnHider;
});

define('dgrid-0.4/Selection',[
	'dojo/_base/declare',
	'dojo/on',
	'dojo/has',
	'dojo/aspect',
	'./List',
	'dojo/has!touch?./util/touch',
	'put-selector/put',
	'dojo/query',
	'dojo/_base/sniff',
	'dojo/dom' // for has('css-user-select') in 1.8.2+
], function (declare, on, has, aspect, List, touchUtil, put) {

	has.add('dom-comparedocumentposition', function (global, doc, element) {
		return !!element.compareDocumentPosition;
	});

	// Add a feature test for the onselectstart event, which offers a more
	// graceful fallback solution than node.unselectable.
	has.add('dom-selectstart', typeof document.onselectstart !== 'undefined');

	var ctrlEquiv = has('mac') ? 'metaKey' : 'ctrlKey',
		hasUserSelect = has('css-user-select'),
		hasPointer = has('pointer'),
		hasMSPointer = hasPointer && hasPointer.slice(0, 2) === 'MS',
		downType = hasPointer ? hasPointer + (hasMSPointer ? 'Down' : 'down') : 'mousedown',
		upType = hasPointer ? hasPointer + (hasMSPointer ? 'Up' : 'up') : 'mouseup';

	if (hasUserSelect === 'WebkitUserSelect' && typeof document.documentElement.style.msUserSelect !== 'undefined') {
		// Edge defines both webkit and ms prefixes, rendering feature detects as brittle as UA sniffs...
		hasUserSelect = false;
	}

	function makeUnselectable(node, unselectable) {
		// Utility function used in fallback path for recursively setting unselectable
		var value = node.unselectable = unselectable ? 'on' : '',
			elements = node.getElementsByTagName('*'),
			i = elements.length;

		while (--i) {
			if (elements[i].tagName === 'INPUT' || elements[i].tagName === 'TEXTAREA') {
				continue; // Don't prevent text selection in text input fields.
			}
			elements[i].unselectable = value;
		}
	}

	function setSelectable(grid, selectable) {
		// Alternative version of dojo/dom.setSelectable based on feature detection.

		// For FF < 21, use -moz-none, which will respect -moz-user-select: text on
		// child elements (e.g. form inputs).  In FF 21, none behaves the same.
		// See https://developer.mozilla.org/en-US/docs/CSS/user-select
		var node = grid.bodyNode,
			value = selectable ? 'text' : has('ff') < 21 ? '-moz-none' : 'none';

		// In IE10+, -ms-user-select: none will block selection from starting within the
		// element, but will not block an existing selection from entering the element.
		// When using a modifier key, IE will select text inside of the element as well
		// as outside of the element, because it thinks the selection started outside.
		// Therefore, fall back to other means of blocking selection for IE10+.
		// Newer versions of Dojo do not even report msUserSelect (see https://github.com/dojo/dojo/commit/7ae2a43).
		if (hasUserSelect && hasUserSelect !== 'msUserSelect') {
			node.style[hasUserSelect] = value;
		}
		else if (has('dom-selectstart')) {
			// For browsers that don't support user-select but support selectstart (IE<10),
			// we can hook up an event handler as necessary.  Since selectstart bubbles,
			// it will handle any child elements as well.
			// Note, however, that both this and the unselectable fallback below are
			// incapable of preventing text selection from outside the targeted node.
			if (!selectable && !grid._selectstartHandle) {
				grid._selectstartHandle = on(node, 'selectstart', function (evt) {
					var tag = evt.target && evt.target.tagName;

					// Prevent selection except where a text input field is involved.
					if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
						evt.preventDefault();
					}
				});
			}
			else if (selectable && grid._selectstartHandle) {
				grid._selectstartHandle.remove();
				delete grid._selectstartHandle;
			}
		}
		else {
			// For browsers that don't support either user-select or selectstart (Opera),
			// we need to resort to setting the unselectable attribute on all nodes
			// involved.  Since this doesn't automatically apply to child nodes, we also
			// need to re-apply it whenever rows are rendered.
			makeUnselectable(node, !selectable);
			if (!selectable && !grid._unselectableHandle) {
				grid._unselectableHandle = aspect.after(grid, 'renderRow', function (row) {
					makeUnselectable(row, true);
					return row;
				});
			}
			else if (selectable && grid._unselectableHandle) {
				grid._unselectableHandle.remove();
				delete grid._unselectableHandle;
			}
		}
	}

	return declare(null, {
		// summary:
		//		Add selection capabilities to a grid. The grid will have a selection property and
		//		fire "dgrid-select" and "dgrid-deselect" events.

		// selectionDelegate: String
		//		Selector to delegate to as target of selection events.
		selectionDelegate: '.dgrid-row',

		// selectionEvents: String|Function
		//		Event (or comma-delimited events, or extension event) to listen on
		//		to trigger select logic.
		selectionEvents: downType + ',' + upType + ',dgrid-cellfocusin',

		// selectionTouchEvents: String|Function
		//		Event (or comma-delimited events, or extension event) to listen on
		//		in addition to selectionEvents for touch devices.
		selectionTouchEvents: has('touch') ? touchUtil.tap : null,

		// deselectOnRefresh: Boolean
		//		If true, the selection object will be cleared when refresh is called.
		deselectOnRefresh: true,

		// allowSelectAll: Boolean
		//		If true, allow ctrl/cmd+A to select all rows.
		//		Also consulted by the selector plugin for showing select-all checkbox.
		allowSelectAll: false,

		// selection:
		//		An object where the property names correspond to
		//		object ids and values are true or false depending on whether an item is selected
		selection: {},

		// selectionMode: String
		//		The selection mode to use, can be "none", "multiple", "single", or "extended".
		selectionMode: 'extended',

		// allowTextSelection: Boolean
		//		Whether to still allow text within cells to be selected.  The default
		//		behavior is to allow text selection only when selectionMode is none;
		//		setting this property to either true or false will explicitly set the
		//		behavior regardless of selectionMode.
		allowTextSelection: undefined,

		// _selectionTargetType: String
		//		Indicates the property added to emitted events for selected targets;
		//		overridden in CellSelection
		_selectionTargetType: 'rows',

		create: function () {
			this.selection = {};
			return this.inherited(arguments);
		},
		postCreate: function () {
			this.inherited(arguments);

			this._initSelectionEvents();

			// Force selectionMode setter to run
			var selectionMode = this.selectionMode;
			this.selectionMode = '';
			this._setSelectionMode(selectionMode);
		},

		destroy: function () {
			this.inherited(arguments);

			// Remove any extra handles added by Selection.
			if (this._selectstartHandle) {
				this._selectstartHandle.remove();
			}
			if (this._unselectableHandle) {
				this._unselectableHandle.remove();
			}
			if (this._removeDeselectSignals) {
				this._removeDeselectSignals();
			}
		},

		_setSelectionMode: function (mode) {
			// summary:
			//		Updates selectionMode, resetting necessary variables.

			if (mode === this.selectionMode) {
				return;
			}

			// Start selection fresh when switching mode.
			this.clearSelection();

			this.selectionMode = mode;

			// Compute name of selection handler for this mode once
			// (in the form of _fooSelectionHandler)
			this._selectionHandlerName = '_' + mode + 'SelectionHandler';

			// Also re-run allowTextSelection setter in case it is in automatic mode.
			this._setAllowTextSelection(this.allowTextSelection);
		},

		_setAllowTextSelection: function (allow) {
			if (typeof allow !== 'undefined') {
				setSelectable(this, allow);
			}
			else {
				setSelectable(this, this.selectionMode === 'none');
			}
			this.allowTextSelection = allow;
		},

		_handleSelect: function (event, target) {
			// Don't run if selection mode doesn't have a handler (incl. "none"), target can't be selected,
			// or if coming from a dgrid-cellfocusin from a mousedown
			if (!this[this._selectionHandlerName] || !this.allowSelect(this.row(target)) ||
					(event.type === 'dgrid-cellfocusin' && event.parentType === 'mousedown') ||
					(event.type === upType && target !== this._waitForMouseUp)) {
				return;
			}
			this._waitForMouseUp = null;
			this._selectionTriggerEvent = event;

			// Don't call select handler for ctrl+navigation
			if (!event.keyCode || !event.ctrlKey || event.keyCode === 32) {
				// If clicking a selected item, wait for mouseup so that drag n' drop
				// is possible without losing our selection
				if (!event.shiftKey && event.type === downType && this.isSelected(target)) {
					this._waitForMouseUp = target;
				}
				else {
					this[this._selectionHandlerName](event, target);
				}
			}
			this._selectionTriggerEvent = null;
		},

		_singleSelectionHandler: function (event, target) {
			// summary:
			//		Selection handler for "single" mode, where only one target may be
			//		selected at a time.

			var ctrlKey = event.keyCode ? event.ctrlKey : event[ctrlEquiv];
			if (this._lastSelected === target) {
				// Allow ctrl to toggle selection, even within single select mode.
				this.select(target, null, !ctrlKey || !this.isSelected(target));
			}
			else {
				this.clearSelection();
				this.select(target);
				this._lastSelected = target;
			}
		},

		_multipleSelectionHandler: function (event, target) {
			// summary:
			//		Selection handler for "multiple" mode, where shift can be held to
			//		select ranges, ctrl/cmd can be held to toggle, and clicks/keystrokes
			//		without modifier keys will add to the current selection.

			var lastRow = this._lastSelected,
				ctrlKey = event.keyCode ? event.ctrlKey : event[ctrlEquiv],
				value;

			if (!event.shiftKey) {
				// Toggle if ctrl is held; otherwise select
				value = ctrlKey ? null : true;
				lastRow = null;
			}
			this.select(target, lastRow, value);

			if (!lastRow) {
				// Update reference for potential subsequent shift+select
				// (current row was already selected above)
				this._lastSelected = target;
			}
		},

		_extendedSelectionHandler: function (event, target) {
			// summary:
			//		Selection handler for "extended" mode, which is like multiple mode
			//		except that clicks/keystrokes without modifier keys will clear
			//		the previous selection.

			// Clear selection first for right-clicks outside selection and non-ctrl-clicks;
			// otherwise, extended mode logic is identical to multiple mode
			if (event.button === 2 ? !this.isSelected(target) :
					!(event.keyCode ? event.ctrlKey : event[ctrlEquiv])) {
				this.clearSelection(null, true);
			}
			this._multipleSelectionHandler(event, target);
		},

		_toggleSelectionHandler: function (event, target) {
			// summary:
			//		Selection handler for "toggle" mode which simply toggles the selection
			//		of the given target.  Primarily useful for touch input.

			this.select(target, null, null);
		},

		_initSelectionEvents: function () {
			// summary:
			//		Performs first-time hookup of event handlers containing logic
			//		required for selection to operate.

			var grid = this,
				contentNode = this.contentNode,
				selector = this.selectionDelegate;

			this._selectionEventQueues = {
				deselect: [],
				select: []
			};

			if (has('touch') && !has('pointer') && this.selectionTouchEvents) {
				// Listen for taps, and also for mouse/keyboard, making sure not
				// to trigger both for the same interaction
				on(contentNode, touchUtil.selector(selector, this.selectionTouchEvents), function (evt) {
					grid._handleSelect(evt, this);
					grid._ignoreMouseSelect = this;
				});
				on(contentNode, on.selector(selector, this.selectionEvents), function (event) {
					if (grid._ignoreMouseSelect !== this) {
						grid._handleSelect(event, this);
					}
					else if (event.type === upType) {
						grid._ignoreMouseSelect = null;
					}
				});
			}
			else {
				// Listen for mouse/keyboard actions that should cause selections
				on(contentNode, on.selector(selector, this.selectionEvents), function (event) {
					grid._handleSelect(event, this);
				});
			}

			// Also hook up spacebar (for ctrl+space)
			if (this.addKeyHandler) {
				this.addKeyHandler(32, function (event) {
					grid._handleSelect(event, event.target);
				});
			}

			// If allowSelectAll is true, bind ctrl/cmd+A to (de)select all rows,
			// unless the event was received from an editor component.
			// (Handler further checks against _allowSelectAll, which may be updated
			// if selectionMode is changed post-init.)
			if (this.allowSelectAll) {
				this.on('keydown', function (event) {
					if (event[ctrlEquiv] && event.keyCode === 65 &&
							!/\bdgrid-input\b/.test(event.target.className)) {
						event.preventDefault();
						grid[grid.allSelected ? 'clearSelection' : 'selectAll']();
					}
				});
			}

			// Update aspects if there is a collection change
			if (this._setCollection) {
				aspect.before(this, '_setCollection', function (collection) {
					grid._updateDeselectionAspect(collection);
				});
			}
			this._updateDeselectionAspect();
		},

		_updateDeselectionAspect: function (collection) {
			// summary:
			//		Hooks up logic to handle deselection of removed items.
			//		Aspects to a trackable collection's notify method if applicable,
			//		or to the list/grid's removeRow method otherwise.

			var self = this,
				signals;

			function ifSelected(rowArg, methodName) {
				// Calls a method if the row corresponding to the object is selected.
				var row = self.row(rowArg),
					selection = row && self.selection[row.id];
				// Is the row currently in the selection list.
				if (selection) {
					self[methodName](row);
				}
			}

			// Remove anything previously configured
			if (this._removeDeselectSignals) {
				this._removeDeselectSignals();
			}

			if (collection && collection.track && this._observeCollection) {
				signals = [
					aspect.before(this, '_observeCollection', function (collection) {
						signals.push(
							collection.on('delete', function (event) {
								if (typeof event.index === 'undefined') {
									// Call deselect on the row if the object is being removed.  This allows the
									// deselect event to reference the row element while it still exists in the DOM.
									ifSelected(event.id, 'deselect');
								}
							})
						);
					}),
					aspect.after(this, '_observeCollection', function (collection) {
						signals.push(
							collection.on('update', function (event) {
								if (typeof event.index !== 'undefined') {
									// When List updates an item, the row element is removed and a new one inserted.
									// If at this point the object is still in grid.selection,
									// then call select on the row so the element's CSS is updated.
									ifSelected(collection.getIdentity(event.target), 'select');
								}
							})
						);
					}, true)
				];
			}
			else {
				signals = [
					aspect.before(this, 'removeRow', function (rowElement, preserveDom) {
						var row;
						if (!preserveDom) {
							row = this.row(rowElement);
							// if it is a real row removal for a selected item, deselect it
							if (row && (row.id in this.selection)) {
								this.deselect(row);
							}
						}
					})
				];
			}

			this._removeDeselectSignals = function () {
				for (var i = signals.length; i--;) {
					signals[i].remove();
				}
				signals = [];
			};
		},

		allowSelect: function () {
			// summary:
			//		A method that can be overriden to determine whether or not a row (or
			//		cell) can be selected. By default, all rows (or cells) are selectable.
			// target: Object
			//		Row object (for Selection) or Cell object (for CellSelection) for the
			//		row/cell in question
			return true;
		},

		_fireSelectionEvent: function (type) {
			// summary:
			//		Fires an event for the accumulated rows once a selection
			//		operation is finished (whether singular or for a range)

			var queue = this._selectionEventQueues[type],
				triggerEvent = this._selectionTriggerEvent,
				eventObject;

			eventObject = {
				bubbles: true,
				grid: this
			};
			if (triggerEvent) {
				eventObject.parentType = triggerEvent.type;
			}
			eventObject[this._selectionTargetType] = queue;

			// Clear the queue so that the next round of (de)selections starts anew
			this._selectionEventQueues[type] = [];

			on.emit(this.contentNode, 'dgrid-' + type, eventObject);
		},

		_fireSelectionEvents: function () {
			var queues = this._selectionEventQueues,
				type;

			for (type in queues) {
				if (queues[type].length) {
					this._fireSelectionEvent(type);
				}
			}
		},

		_select: function (row, toRow, value) {
			// summary:
			//		Contains logic for determining whether to select targets, but
			//		does not emit events.  Called from select, deselect, selectAll,
			//		and clearSelection.

			var selection,
				previousValue,
				element,
				toElement,
				direction;

			if (typeof value === 'undefined') {
				// default to true
				value = true;
			}
			if (!row.element) {
				row = this.row(row);
			}

			// Check whether we're allowed to select the given row before proceeding.
			// If a deselect operation is being performed, this check is skipped,
			// to avoid errors when changing column definitions, and since disabled
			// rows shouldn't ever be selected anyway.
			if (value === false || this.allowSelect(row)) {
				selection = this.selection;
				previousValue = !!selection[row.id];
				if (value === null) {
					// indicates a toggle
					value = !previousValue;
				}
				element = row.element;
				if (!value && !this.allSelected) {
					delete this.selection[row.id];
				}
				else {
					selection[row.id] = value;
				}
				if (element) {
					// add or remove classes as appropriate
					if (value) {
						put(element, '.dgrid-selected' +
							(this.addUiClasses ? '.ui-state-active' : ''));
					}
					else {
						put(element, '!dgrid-selected!ui-state-active');
					}
				}
				if (value !== previousValue && element) {
					// add to the queue of row events
					this._selectionEventQueues[(value ? '' : 'de') + 'select'].push(row);
				}

				if (toRow) {
					if (!toRow.element) {
						toRow = this.row(toRow);
					}

					if (!toRow) {
						this._lastSelected = element;
						console.warn('The selection range has been reset because the ' +
							'beginning of the selection is no longer in the DOM. ' +
							'If you are using OnDemandList, you may wish to increase ' +
							'farOffRemoval to avoid this, but note that keeping more nodes ' +
							'in the DOM may impact performance.');
						return;
					}

					toElement = toRow.element;
					if (toElement) {
						direction = this._determineSelectionDirection(element, toElement);
						if (!direction) {
							// The original element was actually replaced
							toElement = document.getElementById(toElement.id);
							direction = this._determineSelectionDirection(element, toElement);
						}
						while (row.element !== toElement && (row = this[direction](row))) {
							this._select(row, null, value);
						}
					}
				}
			}
		},

		// Implement _determineSelectionDirection differently based on whether the
		// browser supports element.compareDocumentPosition; use sourceIndex for IE<9
		_determineSelectionDirection: has('dom-comparedocumentposition') ? function (from, to) {
			var result = to.compareDocumentPosition(from);
			if (result & 1) {
				return false; // Out of document
			}
			return result === 2 ? 'down' : 'up';
		} : function (from, to) {
			if (to.sourceIndex < 1) {
				return false; // Out of document
			}
			return to.sourceIndex > from.sourceIndex ? 'down' : 'up';
		},

		select: function (row, toRow, value) {
			// summary:
			//		Selects or deselects the given row or range of rows.
			// row: Mixed
			//		Row object (or something that can resolve to one) to (de)select
			// toRow: Mixed
			//		If specified, the inclusive range between row and toRow will
			//		be (de)selected
			// value: Boolean|Null
			//		Whether to select (true/default), deselect (false), or toggle
			//		(null) the row

			this._select(row, toRow, value);
			this._fireSelectionEvents();
		},
		deselect: function (row, toRow) {
			// summary:
			//		Deselects the given row or range of rows.
			// row: Mixed
			//		Row object (or something that can resolve to one) to deselect
			// toRow: Mixed
			//		If specified, the inclusive range between row and toRow will
			//		be deselected

			this.select(row, toRow, false);
		},

		clearSelection: function (exceptId, dontResetLastSelected) {
			// summary:
			//		Deselects any currently-selected items.
			// exceptId: Mixed?
			//		If specified, the given id will not be deselected.

			this.allSelected = false;
			for (var id in this.selection) {
				if (exceptId !== id) {
					this._select(id, null, false);
				}
			}
			if (!dontResetLastSelected) {
				this._lastSelected = null;
			}
			this._fireSelectionEvents();
		},
		selectAll: function () {
			this.allSelected = true;
			this.selection = {}; // we do this to clear out pages from previous sorts
			for (var i in this._rowIdToObject) {
				var row = this.row(this._rowIdToObject[i]);
				this._select(row.id, null, true);
			}
			this._fireSelectionEvents();
		},

		isSelected: function (object) {
			// summary:
			//		Returns true if the indicated row is selected.

			if (typeof object === 'undefined' || object === null) {
				return false;
			}
			if (!object.element) {
				object = this.row(object);
			}

			// First check whether the given row is indicated in the selection hash;
			// failing that, check if allSelected is true (testing against the
			// allowSelect method if possible)
			return (object.id in this.selection) ? !!this.selection[object.id] :
				this.allSelected && (!object.data || this.allowSelect(object));
		},

		refresh: function () {
			if (this.deselectOnRefresh) {
				this.clearSelection();
			}
			this._lastSelected = null;
			return this.inherited(arguments);
		},

		renderArray: function () {
			var rows = this.inherited(arguments),
				selection = this.selection,
				i,
				row,
				selected;

			for (i = 0; i < rows.length; i++) {
				row = this.row(rows[i]);
				selected = row.id in selection ? selection[row.id] : this.allSelected;
				if (selected) {
					this.select(row, null, selected);
				}
			}
			this._fireSelectionEvents();
			return rows;
		}
	});
});


define('dgrid-0.4/extensions/DnD',[
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/_base/array',
	'dojo/aspect',
	'dojo/on',
	'dojo/topic',
	'dojo/has',
	'dojo/when',
	'dojo/dnd/Source',
	'dojo/dnd/Manager',
	'dojo/_base/NodeList',
	'put-selector/put',
	'../Selection',
	'dojo/has!touch?../util/touch',
	'dojo/has!touch?./_DnD-touch-autoscroll',
	'xstyle/css!dojo/resources/dnd.css'
], function (declare, lang, arrayUtil, aspect, on, topic, has, when, DnDSource,
		DnDManager, NodeList, put, Selection, touchUtil) {
	// Requirements
	// * requires a store (sounds obvious, but not all Lists/Grids have stores...)
	// * must support options.before in put calls
	//   (if undefined, put at end)
	// * should support copy
	//   (copy should also support options.before as above)

	// TODOs
	// * consider sending items rather than nodes to onDropExternal/Internal

	var GridDnDSource = declare(DnDSource, {
		grid: null,

		getObject: function (node) {
			// summary:
			//		getObject is a method which should be defined on any source intending
			//		on interfacing with dgrid DnD.

			var grid = this.grid;
			// Extract item id from row node id (gridID-row-*).
			return grid._trackError(function () {
				return grid.collection.get(node.id.slice(grid.id.length + 5));
			});
		},
		_legalMouseDown: function (evt) {
			// Fix _legalMouseDown to only allow starting drag from an item
			// (not from bodyNode outside contentNode).
			var legal = this.inherited(arguments);
			return legal && evt.target !== this.grid.bodyNode;
		},

		// DnD method overrides
		onDrop: function (sourceSource, nodes, copy) {
			var targetSource = this,
				targetRow = this._targetAnchor = this.targetAnchor, // save for Internal
				grid = this.grid,
				store = grid.collection;

			if (!this.before && targetRow) {
				// target before next node if dropped within bottom half of this node
				// (unless there's no node to target at all)
				targetRow = targetRow.nextSibling;
			}
			targetRow = targetRow && grid.row(targetRow);

			when(targetRow && store.get(targetRow.id), function (target) {
				// Note: if dropping after the last row, or into an empty grid,
				// target will be undefined.  Thus, it is important for store to place
				// item last in order if options.before is undefined.

				// Delegate to onDropInternal or onDropExternal for rest of logic.
				// These are passed the target item as an additional argument.
				if (targetSource !== sourceSource) {
					targetSource.onDropExternal(sourceSource, nodes, copy, target);
				}
				else {
					targetSource.onDropInternal(nodes, copy, target);
				}
			});
		},
		onDropInternal: function (nodes, copy, targetItem) {
			var grid = this.grid,
				store = grid.collection,
				targetSource = this,
				anchor = targetSource._targetAnchor,
				targetRow,
				nodeRow;

			if (anchor) { // (falsy if drop occurred in empty space after rows)
				targetRow = this.before ? anchor.previousSibling : anchor.nextSibling;
			}

			// Don't bother continuing if the drop is really not moving anything.
			// (Don't need to worry about edge first/last cases since dropping
			// directly on self doesn't fire onDrop, but we do have to worry about
			// dropping last node into empty space beyond rendered rows.)
			nodeRow = grid.row(nodes[0]);
			if (!copy && (targetRow === nodes[0] ||
					(!targetItem && nodeRow && grid.down(nodeRow).element === nodes[0]))) {
				return;
			}

			nodes.forEach(function (node) {
				when(targetSource.getObject(node), function (object) {
					var id = store.getIdentity(object);

					// For copy DnD operations, copy object, if supported by store;
					// otherwise settle for put anyway.
					// (put will relocate an existing item with the same id, i.e. move).
					grid._trackError(function () {
						return store[copy && store.copy ? 'copy' : 'put'](object, {
							beforeId: targetItem ? store.getIdentity(targetItem) : null
						}).then(function () {
							// Self-drops won't cause the dgrid-select handler to re-fire,
							// so update the cached node manually
							if (targetSource._selectedNodes[id]) {
								targetSource._selectedNodes[id] = grid.row(id).element;
							}
						});
					});
				});
			});
		},
		onDropExternal: function (sourceSource, nodes, copy, targetItem) {
			// Note: this default implementation expects that two grids do not
			// share the same store.  There may be more ideal implementations in the
			// case of two grids using the same store (perhaps differentiated by
			// query), dragging to each other.
			var grid = this.grid,
				store = this.grid.collection,
				sourceGrid = sourceSource.grid;

			// TODO: bail out if sourceSource.getObject isn't defined?
			nodes.forEach(function (node, i) {
				when(sourceSource.getObject(node), function (object) {
					// Copy object, if supported by store; otherwise settle for put
					// (put will relocate an existing item with the same id).
					// Note that we use store.copy if available even for non-copy dnd:
					// since this coming from another dnd source, always behave as if
					// it is a new store item if possible, rather than replacing existing.
					grid._trackError(function () {
						return store[store.copy ? 'copy' : 'put'](object, {
							beforeId: targetItem ? store.getIdentity(targetItem) : null
						}).then(function () {
							if (!copy) {
								if (sourceGrid) {
									// Remove original in the case of inter-grid move.
									// (Also ensure dnd source is cleaned up properly)
									var id = sourceGrid.collection.getIdentity(object);
									!i && sourceSource.selectNone(); // Deselect all, one time
									sourceSource.delItem(node.id);
									return sourceGrid.collection.remove(id);
								}
								else {
									sourceSource.deleteSelectedNodes();
								}
							}
						});
					});
				});
			});
		},

		onDndStart: function (source) {
			// Listen for start events to apply style change to avatar.

			this.inherited(arguments); // DnDSource.prototype.onDndStart.apply(this, arguments);
			if (source === this) {
				// If TouchScroll is in use, cancel any pending scroll operation.
				if (this.grid.cancelTouchScroll) {
					this.grid.cancelTouchScroll();
				}

				// Set avatar width to half the grid's width.
				// Kind of a naive default, but prevents ridiculously wide avatars.
				DnDManager.manager().avatar.node.style.width =
					this.grid.domNode.offsetWidth / 2 + 'px';
			}
		},

		onMouseDown: function (evt) {
			// Cancel the drag operation on presence of more than one contact point.
			// (This check will evaluate to false under non-touch circumstances.)
			if (has('touch') && this.isDragging &&
					touchUtil.countCurrentTouches(evt, this.grid.touchNode) > 1) {
				topic.publish('/dnd/cancel');
				DnDManager.manager().stopDrag();
			}
			else {
				this.inherited(arguments);
			}
		},

		onMouseMove: function (evt) {
			// If we're handling touchmove, only respond to single-contact events.
			if (!has('touch') || touchUtil.countCurrentTouches(evt, this.grid.touchNode) <= 1) {
				this.inherited(arguments);
			}
		},

		checkAcceptance: function (source) {
			// Augment checkAcceptance to block drops from sources without getObject.
			return source.getObject &&
				DnDSource.prototype.checkAcceptance.apply(this, arguments);
		},
		getSelectedNodes: function () {
			// If dgrid's Selection mixin is in use, synchronize with it, using a
			// map of node references (updated on dgrid-[de]select events).

			if (!this.grid.selection) {
				return this.inherited(arguments);
			}
			var t = new NodeList(),
				id;
			for (id in this.grid.selection) {
				t.push(this._selectedNodes[id]);
			}
			return t;	// NodeList
		}
		// TODO: could potentially also implement copyState to jive with default
		// onDrop* implementations (checking whether store.copy is available);
		// not doing that just yet until we're sure about default impl.
	});

	// Mix in Selection for more resilient dnd handling, particularly when part
	// of the selection is scrolled out of view and unrendered (which we
	// handle below).
	var DnD = declare(Selection, {
		// dndSourceType: String
		//		Specifies the type which will be set for DnD items in the grid,
		//		as well as what will be accepted by it by default.
		dndSourceType: 'dgrid-row',

		// dndParams: Object
		//		Object containing params to be passed to the DnD Source constructor.
		dndParams: null,

		// dndConstructor: Function
		//		Constructor from which to instantiate the DnD Source.
		//		Defaults to the GridSource constructor defined/exposed by this module.
		dndConstructor: GridDnDSource,

		postMixInProperties: function () {
			this.inherited(arguments);
			// ensure dndParams is initialized
			this.dndParams = lang.mixin({ accept: [this.dndSourceType] }, this.dndParams);
		},

		postCreate: function () {
			this.inherited(arguments);

			// Make the grid's content a DnD source/target.
			var Source = this.dndConstructor || GridDnDSource;

			var dndParams = lang.mixin(this.dndParams, {
				// add cross-reference to grid for potential use in inter-grid drop logic
				grid: this,
				dropParent: this.contentNode
			});
			if (typeof this.expand === 'function') {
				// If the Tree mixin is being used, allowNested needs to be set to true for DnD to work properly
				// with the child rows.  Without it, child rows will always move to the last child position.
				dndParams.allowNested = true;
			}
			this.dndSource = new Source(this.bodyNode, dndParams);

			// Set up select/deselect handlers to maintain references, in case selected
			// rows are scrolled out of view and unrendered, but then dragged.
			var selectedNodes = this.dndSource._selectedNodes = {};

			function selectRow(row) {
				selectedNodes[row.id] = row.element;
			}
			function deselectRow(row) {
				delete selectedNodes[row.id];
				// Re-sync dojo/dnd UI classes based on deselection
				// (unfortunately there is no good programmatic hook for this)
				put(row.element, '!dojoDndItemSelected!dojoDndItemAnchor');
			}

			this.on('dgrid-select', function (event) {
				arrayUtil.forEach(event.rows, selectRow);
			});
			this.on('dgrid-deselect', function (event) {
				arrayUtil.forEach(event.rows, deselectRow);
			});

			aspect.after(this, 'destroy', function () {
				delete this.dndSource._selectedNodes;
				selectedNodes = null;
				this.dndSource.destroy();
			}, true);
		},

		insertRow: function (object) {
			// override to add dojoDndItem class to make the rows draggable
			var row = this.inherited(arguments),
				type = typeof this.getObjectDndType === 'function' ?
					this.getObjectDndType(object) : [this.dndSourceType];

			put(row, '.dojoDndItem');
			this.dndSource.setItem(row.id, {
				data: object,
				type: type instanceof Array ? type : [type]
			});
			return row;
		},

		removeRow: function (rowElement) {
			this.dndSource.delItem(this.row(rowElement));
			this.inherited(arguments);
		}
	});
	DnD.GridSource = GridDnDSource;

	return DnD;
});

/**
 * @module
 * @class DnDManager
 * @extends dgrid/dnd/Manager
 * @see https://github.com/SitePen/dgrid/blob/dev-0.4/doc/components/extensions/DnD.md
 * Overrides DnDManager funciontality so that the avatar doesn't jump around when doing drag
 * and drop via keyboard navigation
 * @param {Event} e - The mouse move event
 */
define('hui/table/TableDndSource',[
    'dgrid/extensions/DnD',
    'dojo/dnd/common',
    'dojo/dnd/Manager',
    'dojo/dnd/autoscroll',
    'dojo/dnd/Selector',
    'dojo/_base/declare',
    'dojo/has',
    'dojo/on'
], function(DnD, dnd, DnDManager, autoscroll, Selector, declare, has, on) {
    DnDManager.extend({
        onMouseMove: function(e) {
            if (!this.dragging) {
                var a = this.avatar,
                    s,
                    copy;
                if (a) {
                    autoscroll.autoScrollNodes(e);
                    //autoscroll.autoScroll(e);
                    s = a.node.style;
                    s.left = (e.pageX + this.OFFSET_X) + 'px';
                    s.top = (e.pageY + this.OFFSET_Y) + 'px';
                    copy = Boolean(this.source.copyState(dnd.getCopyKeyState(e)));
                    if (this.copy !== copy) {
                        this._setCopyStatus(copy);
                    }
                }
                if (has('touch')) {
                    // Prevent page from scrolling so that user can drag instead.
                    e.preventDefault();
                }
            }
        }
    });

    return declare(DnD.GridSource.extend({
        /**
         * Applies styling to the DnD source when drag and drop begins, and adds aria
         * attributes for all rows in this grid indicating that they're valid targets
         * for drag and drop.
         * @param {Source} source - The drag and drop source that is being dragged
         */
        onDndStart: function(source) {
            // Listen for start events to apply style change to avatar.
            this.inherited(arguments); // DnDSource.prototype.onDndStart.apply(this, arguments);
            if (source === this) {
                // If TouchScroll is in use, cancel any pending scroll operation.
                if (this.grid.cancelTouchScroll) {
                    this.grid.cancelTouchScroll();
                }

                var avatarNode = DnDManager.manager().avatar.node,
                    header = avatarNode.querySelector('.dojoDndAvatarHeader'),
                    selectedClones = avatarNode.querySelectorAll('.dgrid-selected'),
                    items = avatarNode.querySelectorAll('.dojoDndAvatarItem'),
                    row = this.grid.domNode.querySelector('.dgrid-row');

                // Get rid of inline styles
                if (items) {
                    Array.prototype.forEach.call(items, function(item) {
                        item.style.opacity = '';
                        item.classList.add('ha-table-drag-and-drop');
                    });
                }

                // Set the width to the actual width of rows in the grid
                avatarNode.style.width = row ? row.offsetWidth + 'px': '';

                if (header) {
                    header.parentNode.removeChild(header);
                }

                // Remove selected styling on clone
                if (selectedClones) {
                    Array.prototype.forEach.call(selectedClones, function(selectedClone) {
                        selectedClone.classList.remove('dgrid-selected');
                    });
                }

                if (source.grid.domNode.parentNode.classList.contains('compact')) {
                    avatarNode.classList.add('compact');
                } else if (source.grid.domNode.parentNode.classList.contains('double')) {
                    avatarNode.classList.add('double');
                }

                Array.prototype.forEach.call(
                    source.grid.domNode.querySelectorAll('.dgrid-row'),
                    function(row) {
                        row.setAttribute('aria-dropeffect', 'move');
                    }
                );
            }
        },

        /**
         * Returns the node currently being dragged
         * returns {HTMLElement} The currently selected node
         */
        getSelectedNodes: function() {
            return this.inherited(arguments);
        }
    }), {
        SpaceKeyCode: 32,
        EscapeKeyCode: 27,
        ArrowUpKeyCode: 38,
        ArrowDownKeyCode: 40,
        EnterKeyCode: 13,
        MKeyCode: 77,
        scrollListener: null,
        dragging: false,
        scrollCushion: 50,

        /**
         * An icon to point at the currently targeted row
         * @type {HTMLElement}
         * @private
         */
        _targetIcon: null,

        /**
         * Extends the normal cancel functionality to remove aria attributes
         * from grid rows and to restart the scroll listener
         */
        onDndCancel: function() {
            this.inherited(arguments);
            Array.prototype.forEach.call(
                this.grid.domNode.querySelectorAll('.dgrid-row'),
                function(row) {
                    row.removeAttribute('aria-dropeffect');
                }
            );
            this.dragging = false;
            DnDManager.manager().dragging = false;
            this.scrollListener.resume();
        },

        /**
         * Extends the normal drop functionality to remove aria attributes from
         * grid rows and to restart the scroll listener
         */
        onDndDrop: function() {
            this.inherited(arguments);
            Array.prototype.forEach.call(
                this.grid.domNode.querySelectorAll('.dgrid-row'),
                function(row) {
                    row.removeAttribute('aria-dropeffect');
                }
            );
            this.dragging = false;
            DnDManager.manager().dragging = false;
            this.scrollListener.resume();
        },

        /**
         * Creates the target icon and initializes needed event listeners
         */
        constructor: function() {
            this._targetIcon = document.createElement('div');

            if (this.grid && this.grid.domNode && this.grid.domNode.parentNode) {
                this.grid.domNode.parentNode.appendChild(this._targetIcon);
            }
            this._targetIcon.classList.add('hidden');
            this._targetIcon.classList.add('hi');
            this._targetIcon.classList.add('hi-adjust');
            this._targetIcon.classList.add('drag-and-drop-target-icon');

            this.scrollListener = on.pausable(this.node, 'scroll', this._unmarkTargetAnchor.bind(this));
            this.events.push(
                this.scrollListener,
                on(this.node, '.ha-dnd-button:keydown', this.onKeyDown.bind(this))
            );
        },

        /**
         * Positions the target icon at the appropriate spot next to the currently
         * targeted anchor
         * @param {Boolean} before - Whether or not the item will be dropped before the currently
         * targeted element
         * @param {Boolean} isKeyboardNav - Whether this was triggered by keyboard navigation
         * @private
         */
        _markTargetAnchor: function(before, isKeyboardNav) {
            this.inherited(arguments);

            var avatar,
                boundingRect,
                top;
            if (this.targetAnchor) {
                boundingRect = this.targetAnchor.getBoundingClientRect();
                top = before ? boundingRect.top -12 : boundingRect.bottom - 13;
                this._targetIcon.style.top = (top + (window.scrollY || window.pageYOffset)) + 'px';
                this._targetIcon.style.left = (boundingRect.left - 20) + 'px';

                this._targetIcon.classList.remove('hidden');
                if (isKeyboardNav) {
                    avatar = DnDManager.manager().avatar;
                    avatar.node.style.left = (boundingRect.left + Math.min(this.targetAnchor.offsetWidth / 5, 75)) + 'px';
                    avatar.node.style.top = (boundingRect.bottom + (window.scrollY || window.pageYOffset) + this.targetAnchor.offsetHeight) + 'px';
                }
            }

        },

        /**
         * Hides the target icon
         * @private
         */
        _unmarkTargetAnchor: function() {
            this.inherited(arguments);
            this._targetIcon.classList.add('hidden');
        },

        /**
         * Blocks default mouse over behavior if drag and drop was initiated via keyboard
         */
        onMouseOver: function() {
            if (!this.dragging) {
                this.inherited(arguments);
            }
        },

        /**
         * Blocks default mouse move behavior if drag and drop was initiated via keyboard
         */
        onMouseMove: function() {
            if (!this.dragging) {
                this.inherited(arguments);
            }
        },

        /**
         * Blocks default source over behavior if drag and drop was initiated via keyboard
         */
        onDndSourceOver: function() {
            if (!this.dragging) {
                this.inherited(arguments);
            }
        },

        /**
         * Handles keyDown events, which include arrow keys(used to change the currently selected element during
         * drag and drop), and ctrl + m, which is the recommended key combination for dropping an element
         * during drag and drop.
         * @param {Event} e - The keyDown event
         */
        onKeyDown: function(e) {
            var position = e.target.getBoundingClientRect(),
                clickedUp,
                row,
                newTargetAnchor,
                manager = DnDManager.manager();

            if (this.dragging) {
                row = this.grid.row(this.current || e.target);
                if ((clickedUp = e.keyCode === this.ArrowUpKeyCode) || e.keyCode === this.ArrowDownKeyCode) {
                    e.preventDefault();
                    if (clickedUp) {
                        newTargetAnchor = (row && row.element && row.element.previousSibling) ?
                            row.element.previousSibling : this.current ? this.current.previousSibling : null;
                    } else {
                        newTargetAnchor = (row && row.element && row.element.nextSibling) ?
                            row.element.nextSibling : this.current ? this.current.nextSibling : null;
                    }

                    if (newTargetAnchor && newTargetAnchor.classList.contains('dgrid-row')) {
                        this._unmarkTargetAnchor();
                        if (newTargetAnchor.offsetTop > (this.grid.bodyNode.scrollTop + this.grid.bodyNode.offsetHeight -
                            this.scrollCushion)) {
                            this.grid.scrollTo({
                                y: this.grid.bodyNode.scrollTop + newTargetAnchor.offsetHeight
                            });
                        } else if (newTargetAnchor.offsetTop < this.grid.bodyNode.scrollTop) {
                            this.grid.scrollTo({
                                y: this.grid.bodyNode.scrollTop - newTargetAnchor.offsetHeight
                            });
                        }
                        this.current = newTargetAnchor;
                        this._markTargetAnchor(false, true);
                    }
                } else if ((e.keyCode === this.MKeyCode && e.ctrlKey) ||
                    e.keyCode === this.EnterKeyCode) {
                    manager.canDropFlag = true;
                    manager.onMouseUp(e);
                } else if (e.keyCode === this.EscapeKeyCode) {
                    manager.stopDrag();
                    this.onDndCancel();
                }
            } else {
                row = this.grid.row(e.target);
                if (e.keyCode === this.SpaceKeyCode) {
                    this.current = (row && row.element) ? row.element : e.target;
                    this.dragging = true;
                    DnDManager.manager().dragging = true;
                    this.scrollListener.pause();
                    if (e.target.hasAttribute('aria-grabbed')) {
                        e.target.setAttribute('aria-grabbed', true);
                    }
                    //this.onDndStart(e.target);
                    manager.startDrag(this, [row.element], false);
                    this._lastX = position.left;
                    this._lastY = position.top;
                    Selector.prototype.onMouseDown.call(this, e);

                    this.onDndStart(this, [row.element]);
                    this._markTargetAnchor(false, true);
                }
            }
        }
    });
});

/**
 * @external dgrid/extensions/DnD
 * @see https://github.com/SitePen/dgrid/blob/dev-0.4/doc/components/extensions/DnD.md
 */

/**
 * @module
 * @class RowReordering
 * @extends dgrid/extensions/DnD
 *
 * Adds drag and drop reordering functionality to the table, setting up a
 * custom look and feel for the action
 *
 * This module is automatically mixed into the dgrid instance
 * created in TableBase.factory
 */
define('hui/table/RowReordering',[
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dgrid/extensions/DnD',
    './TableDndSource',
    '../core/utils'
], function(declare, lang, DnD, TableDndSource, utils) {
    return declare(DnD, {
        /**
         * Allow drag and drop row reordering
         * @default
         * @type {Boolean}
         */
        allowRowReordering: false,

        /**
         * The name of the row reordering field property
         * @default
         * @type {String}
         */
        rowReorderField: '_rowReorder',

        /**
         * The text rendered for screen rows next to the reorder icon
         * @type {String}
         */
        _reorderIconText: 'Reorder Row',

        /**
         * The Constructor to use for Drag and Drop sources
         * @type {Function}
         */
        dndConstructor: TableDndSource,

        /**
         * Keeps track of whether reordering is temporarily disabled so
         * that if a row is rerendered the drag and drop icon can be
         * properly styled.
         * @type {Boolean}
         */
        dndEnabled: false,

        /**
         * Adds the withHandles flag to Drag and Drop parameters
         * so that only the drag and drop icon will be usable as a handle
         * to drag the row.
         */
        postMixInProperties: function() {
            this.inherited(arguments);
            // ensure dndParams is initialized
            this.dndParams = lang.mixin({ withHandles: true}, this.dndParams);
        },

        _enableDnd: function(dndEnabled) {
            this.dndEnabled = dndEnabled;

            Array.prototype.forEach.call(
                this.domNode.querySelectorAll('.hi-arrange'),
                this._toggleIcon.bind(null, dndEnabled)
            );
        },

        /**
         * Toggles the drag and drop icon styling and functionality
         * between enabled and disabled modes
         * @param {Boolean} enabled - Whether the icon should be enabled
         * @private
         */
        _toggleIcon: function(enabled, iconElement) {
            if (!iconElement) {
                return;
            }
            if (enabled) {
                iconElement.parentNode.setAttribute('aria-grabbed', 'false');
                iconElement.classList.remove('disabled-dnd-handle');
                iconElement.parentNode.parentNode.classList.add('dojoDndHandle');
                iconElement.parentNode.classList.add('ha-dnd-button');
            } else {
                iconElement.parentNode.setAttribute('aria-grabbed', '');
                iconElement.classList.add('disabled-dnd-handle');
                iconElement.parentNode.parentNode.classList.remove('dojoDndHandle');
                iconElement.parentNode.classList.remove('ha-dnd-button');
            }
        },

        /**
         * Sets the accessibility text for the reorder icons and refreshes the table
         * @param {String} reorderIconText - The new value for the reorder icon property
         * @private
         */
        _setReorderIconText: function(reorderIconText) {
            this._reorderIconText = reorderIconText;
            this.refresh();
        },

        /**
         * Disables and re-enables drag and drop icons when batch mode is toggled
         * @param {Boolean} isActive - Flag indicating whether batch mode is active or inactive
         * @private
         */
        _setBatchModeActive: function(isActive) {
            this.inherited(arguments);
            this._enableDnd(!isActive);
        },

        _setEditable: function(isEditable) {
            this.inherited(arguments);
            this._enableDnd(!isEditable);
        },

        /**
         * Extends the basic render row functionality to toggle the drag and drop icon
         * based on whether batch mode is currently enabled
         * @returns {Object} - The created row object
         */
        renderRow: function() {
            var row = this.inherited(arguments);

            this._toggleIcon(this.dndEnabled, row.querySelector('.hi-arrange'));

            return row;
        },

        /**
         * Enable or disable row reordering
         * @param {Boolean} enabled - Whether row reordering should be enabled
         * @private
         */
        _setAllowRowReordering: function(enabled) {
            this.allowRowReordering = enabled;
            this.set('columns', this.table && this.table.originalColumns ?
                utils.clone(this.table.originalColumns, [this]) : this.__columns);
            this._enableDnd(enabled);
        },

        /**
         * Adds the row reordering column if row reordering is enabled
         * @param {Array} columnsArray - The existing array of columns
         * @private
         */
        _addCustomColumn: function(columnsArray) {
            this.inherited(arguments);
            if (this.get('allowRowReordering')) {
                columnsArray.unshift(this._defineRowReorderColumn());
            }
        },

        /**
         * Returns the definition of the row reorder column
         * @returns {Object}
         * @private
         */
        _defineRowReorderColumn: function() {
            var column = {
                field: this.rowReorderField,
                sortable: false,
                unhidable: true
            };

            column.renderCell = this._renderReorderCell.bind(this);

            column.renderHeaderCell = function(th) {
                th.textContent = '';
            };
            return column;
        },

        _renderReorderCell: function() {
            var cell = arguments[2],
                button = document.createElement('button'),
                iconSpan = document.createElement('span'),
                iconTextSpan = document.createElement('span');

            cell.classList.add('dojoDndHandle');

            iconSpan.classList.add('hi-arrange');
            iconSpan.classList.add('hi');
            iconSpan.setAttribute('aria-hidden', true);
            iconTextSpan.textContent = this._reorderIconText;
            iconTextSpan.classList.add('icon-text');
            button.setAttribute('aria-grabbed', false);
            button.classList.add('ha-dnd-button');
            button.appendChild(iconSpan);
            button.appendChild(iconTextSpan);
            cell.appendChild(button);

            cell.addEventListener('pointerdown', this._stopPropagation);
            cell.addEventListener('MSPointerDown', this._stopPropagation);
            cell.addEventListener('click', this._stopPropagation);
            cell.addEventListener('mousedown', this._delegateToDnDMouseDown.bind(this));
        },

        _delegateToDnDMouseDown: function(event) {
            if (this.dndSource && this.dndSource.onMouseDown) {
                this.dndSource.onMouseDown(event);
            }
        },

        _stopPropagation: function(event) {
            event.stopPropagation();
        }
    });
});

/**
 * @module
 * This module adds row deletion capabilities to the dgrid instance
 *
 * This module is automatically mixed into the dgrid instance
 * created in TableBase.factory
 */
define('hui/table/RowDeletion',[
    'dojo/_base/declare'
], function(declare) {
    return declare(null, {
        /**
         * Allow row deletion
         * @default
         * @type {Boolean}
         */
        allowRowDeletion: false,

        /**
         * The name of the row delete field property
         * @default
         * @type {String}
         */
        _rowDeletionField: '_rowDelete',

        /**
         * The text rendered for screen rows next to the delete icon
         * @type {String}
         */
        _deletionIconText: 'Delete Row',

        /**
         * The icon to be added to the delete button
         * @type {String}
         */
        _deletionIconClass: 'hi-delete',

        /**
         * Sets the accessibility text for the delete icons and refreshes the table
         * @param {String} deletionIconText - The new value for the delete icon property
         * @private
         */
        _setDeletionIconText: function(deletionIconText) {
            this._deletionIconText = deletionIconText;
            this.refresh();
        },

        /**
         * Sets the deletion icon class for the delete icon and refreshes the table.
         * @param {String} deletionIconClass - The new deletion icon class
         * @private
         */
        _setDeletionIconClass: function(deletionIconClass) {
            this._deletionIconClass = deletionIconClass;
            this.refresh();
        },

        /**
         * Enable or disable row deletion
         * @param {Boolean} enabled - Whether row deletion should be enabled
         * @private
         */
        _setAllowRowDeletion: function(enabled) {
            this.allowRowDeletion = enabled;
            this.set('columns', this.__columns);
        },

        /**
         * Returns columns, using the private property if available,
         * and otherwise delegating to the default getter.
         * @returns {Array | Object} - The column definition for this table
         * @private
         */
        _getColumns: function() {
            return this.__columns || this.inherited(arguments);
        },

        /**
         * Adds the row deletion column if row deletion is enabled
         * @param {Array} columnsArray - The existing array of columns
         * @private
         */
        _addCustomColumn: function(columnsArray) {
            this.inherited(arguments);
            if (this.get('allowRowDeletion')) {
                columnsArray.push(this._defineRowDeletionColumn());
            }
        },

        /**
         * Returns the definition of the row deletion column
         * @returns {Object}
         * @private
         */
        _defineRowDeletionColumn: function() {
            var column = {
                field: this._rowDeletionField,
                sortable: false,
                unhidable: true
            };

            column.renderCell = this._renderDeletionCell.bind(this);

            column.renderHeaderCell = function(th) {
                th.textContent = '';
            };
            return column;
        },

        _clickHandler: function(evt) {
            evt.stopPropagation();
            evt.preventDefault();

            var row = this.row(evt);

            if (row) {
                this._previousScrollPosition = this.getScrollPosition();
                var rowIdProp = this.collection.idProperty ? this.collection.idProperty : 'id';
                this.collection.remove(row[rowIdProp]);

                this.refresh();
            }
        },

        _renderDeletionCell: function() {
            var cell = arguments[2],
                button = document.createElement('button'),
                iconSpan = document.createElement('span'),
                iconTextSpan = document.createElement('span');

            iconSpan.classList.add(this._deletionIconClass);
            iconSpan.classList.add('hi');
            iconSpan.setAttribute('aria-hidden', true);
            iconTextSpan.textContent = this._deletionIconText;
            iconTextSpan.classList.add('icon-text');

            button.appendChild(iconSpan);
            button.appendChild(iconTextSpan);
            cell.appendChild(button);

            button.addEventListener('click', this._clickHandler.bind(this));
        }
    });
});

define('dgrid-0.4/Editor',[
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/Deferred',
	'dojo/on',
	'dojo/has',
	'dojo/query',
	'./Grid',
	'put-selector/put',
	'dojo/_base/sniff'
], function (declare, lang, Deferred, on, has, query, Grid, put) {

	return declare(null, {
		constructor: function () {
			this._editorInstances = {};
			// Tracks shared editor dismissal listeners, and editor click/change listeners for old IE
			this._editorColumnListeners = [];
			// Tracks always-on editor listeners for old IE, or listeners for triggering shared editors
			this._editorCellListeners = {};
			this._editorsPendingStartup = [];
		},

		postCreate: function () {
			var self = this;

			this.inherited(arguments);

			this.on('.dgrid-input:focusin', function () {
				self._focusedEditorCell = self.cell(this);
			});
			this._editorFocusoutHandle = on.pausable(this.domNode, '.dgrid-input:focusout', function () {
				self._focusedEditorCell = null;
			});
			this._listeners.push(this._editorFocusoutHandle);
		},

		insertRow: function () {
			this._editorRowListeners = {};
			var rowElement = this.inherited(arguments);
			var row = this.row(rowElement);
			var rowListeners = this._editorCellListeners[rowElement.id] =
				this._editorCellListeners[rowElement.id] || {};

			for (var key in this._editorRowListeners) {
				rowListeners[key] = this._editorRowListeners[key];
			}
			// Null this out so that _createEditor can tell whether the editor being created is
			// an individual cell editor at insertion time
			this._editorRowListeners = null;

			var previouslyFocusedCell = this._previouslyFocusedEditorCell;

			if (previouslyFocusedCell && previouslyFocusedCell.row.id === row.id) {
				this.edit(this.cell(row, previouslyFocusedCell.column.id));
			}
			return rowElement;
		},

		refresh: function () {
			for (var id in this._editorInstances) {
				var editorInstanceDomNode = this._editorInstances[id].domNode;
				if (editorInstanceDomNode && editorInstanceDomNode.parentNode) {
					// Remove any editor widgets from the DOM before List destroys it, to avoid issues in IE (#1100)
					editorInstanceDomNode.parentNode.removeChild(editorInstanceDomNode);
				}
			}

			this.inherited(arguments);
		},

		removeRow: function (rowElement) {
			var self = this;
			var focusedCell = this._focusedEditorCell;

			if (focusedCell && focusedCell.row.id === this.row(rowElement).id) {
				this._previouslyFocusedEditorCell = focusedCell;
				// Pause the focusout handler until after this row has had
				// time to re-render, if this removal is part of an update.
				// A setTimeout is used here instead of resuming in insertRow,
				// since if a row were actually removed (not updated) while
				// editing, the handler would not be properly hooked up again
				// for future occurrences.
				this._editorFocusoutHandle.pause();
				setTimeout(function () {
					self._editorFocusoutHandle.resume();
					self._previouslyFocusedEditorCell = null;
				}, 0);
			}

			if (this._editorCellListeners[rowElement.id]) {
				for (var columnId in this._editorCellListeners[rowElement.id]) {
					this._editorCellListeners[rowElement.id][columnId].remove();
				}
				delete this._editorCellListeners[rowElement.id];
			}

			for (var i = this._alwaysOnWidgetColumns.length; i--;) {
				// Destroy always-on editor widgets during the row removal operation,
				// but don't trip over loading nodes from incomplete requests
				var cellElement = this.cell(rowElement, this._alwaysOnWidgetColumns[i].id).element,
					widget = cellElement && (cellElement.contents || cellElement).widget;
				if (widget) {
					this._editorFocusoutHandle.pause();
					widget.destroyRecursive();
				}
			}

			return this.inherited(arguments);
		},

		renderArray: function () {
			var rows = this.inherited(arguments);
			if (rows.length) {
				// Finish processing any pending editors that are now displayed
				this._startupPendingEditors();
			}
			else {
				this._editorsPendingStartup = [];
			}
			return rows;
		},

		_onNotification: function () {
			this.inherited(arguments);
			this._startupPendingEditors();
		},

		_destroyColumns: function () {
			this._editorStructureCleanup();
			this.inherited(arguments);
		},

		_editorStructureCleanup: function () {
			var editorInstances = this._editorInstances;
			var listeners = this._editorColumnListeners;

			if (this._editTimer) {
				clearTimeout(this._editTimer);
			}
			// Do any clean up of previous column structure.
			for (var columnId in editorInstances) {
				var editor = editorInstances[columnId];
				if (editor.domNode) {
					// The editor is a widget
					editor.destroyRecursive();
				}
			}
			this._editorInstances = {};

			for (var i = listeners.length; i--;) {
				listeners[i].remove();
			}

			for (var rowId in this._editorCellListeners) {
				for (columnId in this._editorCellListeners[rowId]) {
					this._editorCellListeners[rowId][columnId].remove();
				}
			}

			for (i = 0; i < this._editorColumnListeners.length; i++) {
				this._editorColumnListeners[i].remove();
			}

			this._editorCellListeners = {};
			this._editorColumnListeners = [];
			this._editorsPendingStartup = [];
		},

		_configColumns: function () {
			var columnArray = this.inherited(arguments);
			this._alwaysOnWidgetColumns = [];
			for (var i = 0, l = columnArray.length; i < l; i++) {
				if (columnArray[i].editor) {
					this._configureEditorColumn(columnArray[i]);
				}
			}
			return columnArray;
		},

		_configureEditorColumn: function (column) {
			// summary:
			//		Adds editing capability to a column's cells.

			var editor = column.editor;
			var self = this;

			var originalRenderCell = column.renderCell || this._defaultRenderCell;
			var editOn = column.editOn;
			var isWidget = typeof editor !== 'string';

			if (editOn) {
				// Create one shared widget/input to be swapped into the active cell.
				this._editorInstances[column.id] = this._createSharedEditor(column, originalRenderCell);
			}
			else if (isWidget) {
				// Append to array iterated in removeRow
				this._alwaysOnWidgetColumns.push(column);
			}

			column.renderCell = editOn ? function (object, value, cell, options) {
				// TODO: Consider using event delegation
				// (Would require using dgrid's focus events for activating on focus,
				// which we already advocate in docs for optimal use)

				if (!options || !options.alreadyHooked) {
					var listener = on(cell, editOn, function () {
						self._activeOptions = options;
						self.edit(this);
					});
					if (self._editorRowListeners) {
						self._editorRowListeners[column.id] = listener;
					}
				}

				// initially render content in non-edit mode
				return originalRenderCell.call(column, object, value, cell, options);

			} : function (object, value, cell, options) {
				// always-on: create editor immediately upon rendering each cell
				if (!column.canEdit || column.canEdit(object, value)) {
					var cmp = self._createEditor(column);
					self._showEditor(cmp, column, cell, value);
					// Maintain reference for later use.
					cell[isWidget ? 'widget' : 'input'] = cmp;
				}
				else {
					return originalRenderCell.call(column, object, value, cell, options);
				}
			};
		},

		edit: function (cell) {
			// summary:
			//		Shows/focuses the editor for a given grid cell.
			// cell: Object
			//		Cell (or something resolvable by grid.cell) to activate editor on.
			// returns:
			//		If the cell is editable, returns a promise resolving to the editor
			//		input/widget when the cell editor is focused.
			//		If the cell is not editable, returns null.

			var self = this;
			var column;
			var cellElement;
			var dirty;
			var field;
			var value;
			var cmp;
			var dfd;

			function showEditor(dfd) {
				self._activeCell = cellElement;
				self._showEditor(cmp, column, cellElement, value);

				// focus / blur-handler-resume logic is surrounded in a setTimeout
				// to play nice with Keyboard's dgrid-cellfocusin as an editOn event
				self._editTimer = setTimeout(function () {
					// focus the newly-placed control (supported by form widgets and HTML inputs)
					if (cmp.focus) {
						cmp.focus();
					}
					// resume blur handler once editor is focused
					if (column._editorBlurHandle) {
						column._editorBlurHandle.resume();
					}
					self._editTimer = null;
					dfd.resolve(cmp);
				}, 0);
			}

			if (!cell.column) {
				cell = this.cell(cell);
			}
			if (!cell || !cell.element) {
				return null;
			}

			column = cell.column;
			field = column.field;
			cellElement = cell.element.contents || cell.element;

			if ((cmp = this._editorInstances[column.id])) {
				// Shared editor (editOn used)
				if (this._activeCell !== cellElement) {
					// Get the cell value
					var row = cell.row;
					dirty = this.dirty && this.dirty[row.id];
					value = (dirty && field in dirty) ? dirty[field] :
						column.get ? column.get(row.data) : row.data[field];
					// Check to see if the cell can be edited
					if (!column.canEdit || column.canEdit(cell.row.data, value)) {
						dfd = new Deferred();

						// In some browsers, moving a DOM node causes a blur event to fire which in this case,
						// is a bad time for the blur handler to run.  Blur the input node first.
						var node = cmp.domNode || cmp;
						if (node.offsetWidth) {
							// The editor is visible.  Blur it.
							node.blur();
							// In IE, the blur does not complete immediately.
							// Push showing of the editor to the next turn.
							// (dfd will be resolved within showEditor)
							setTimeout(function () {
								showEditor(dfd);
							}, 0);
						} else {
							showEditor(dfd);
						}

						return dfd.promise;
					}
				}
			}
			else if (column.editor) {
				// editor but not shared; always-on
				cmp = cellElement.widget || cellElement.input;
				if (cmp) {
					dfd = new Deferred();
					if (cmp.focus) {
						cmp.focus();
					}
					dfd.resolve(cmp);
					return dfd.promise;
				}
			}
			return null;
		},

		_showEditor: function (cmp, column, cellElement, value) {
			// Places a shared editor into the newly-active cell in the column.
			// Also called when rendering an editor in an "always-on" editor column.

			var isWidget = cmp.domNode;
			// for regular inputs, we can update the value before even showing it
			if (!isWidget) {
				this._updateInputValue(cmp, value);
			}

			cellElement.innerHTML = '';
			put(cellElement, '.dgrid-cell-editing');
			put(cellElement, cmp.domNode || cmp);

			// If a shared editor is a validation widget, reset it to clear validation state
			// (The value will be preserved since it is explicitly set in _startupEditor)
			if (isWidget && column.editOn && cmp.validate && cmp.reset) {
				cmp.reset();
			}

			if (isWidget && !column.editOn) {
				// Queue arguments to be run once editor is in DOM
				this._editorsPendingStartup.push([cmp, column, cellElement, value]);
			}
			else {
				this._startupEditor(cmp, column, cellElement, value);
			}
		},

		_startupEditor: function (cmp, column, cellElement, value) {
			// summary:
			//		Handles editor widget startup logic and updates the editor's value.

			if (cmp.domNode) {
				// For widgets, ensure startup is called before setting value, to maximize compatibility
				// with flaky widgets like dijit/form/Select.
				if (!cmp._started) {
					cmp.startup();
				}

				// Set value, but ensure it isn't processed as a user-generated change.
				// (Clear flag on a timeout to wait for delayed onChange to fire first)
				cmp._dgridIgnoreChange = true;
				cmp.set('value', value);
				setTimeout(function () {
					cmp._dgridIgnoreChange = false;
				}, 0);
			}

			// track previous value for short-circuiting or in case we need to revert
			cmp._dgridLastValue = value;
			// if this is an editor with editOn, also update _activeValue
			// (_activeOptions will have been updated previously)
			if (this._activeCell) {
				this._activeValue = value;
				// emit an event immediately prior to placing a shared editor
				on.emit(cellElement, 'dgrid-editor-show', {
					grid: this,
					cell: this.cell(cellElement),
					column: column,
					editor: cmp,
					bubbles: true,
					cancelable: false
				});
			}
		},

		_startupPendingEditors: function () {
			var args = this._editorsPendingStartup;
			for (var i = args.length; i--;) {
				this._startupEditor.apply(this, args[i]);
			}
			this._editorsPendingStartup = [];
		},

		_handleEditorChange: function (evt, column) {
			var target = evt.target;
			if ('_dgridLastValue' in target && target.className.indexOf('dgrid-input') > -1) {
				this._updatePropertyFromEditor(column || this.cell(target).column, target, evt);
			}
		},

		_createEditor: function (column) {
			// Creates an editor instance based on column definition properties,
			// and hooks up events.
			var editor = column.editor,
				editOn = column.editOn,
				self = this,
				Widget = typeof editor !== 'string' && editor,
				args, cmp, node, putstr;

			args = column.editorArgs || {};
			if (typeof args === 'function') {
				args = args.call(this, column);
			}

			if (Widget) {
				cmp = new Widget(args);
				node = cmp.focusNode || cmp.domNode;

				// Add dgrid-input to className to make consistent with HTML inputs.
				node.className += ' dgrid-input';

				// For editOn editors, connect to onBlur rather than onChange, since
				// the latter is delayed by setTimeouts in Dijit and will fire too late.
				cmp.on(editOn ? 'blur' : 'change', function () {
					if (!cmp._dgridIgnoreChange) {
						self._updatePropertyFromEditor(column, this, {type: 'widget'});
					}
				});
			}
			else {
				// considerations for standard HTML form elements
				if (!this._hasInputListener) {
					// register one listener at the top level that receives events delegated
					this._hasInputListener = true;
					this.on('change', function (evt) {
						self._handleEditorChange(evt);
					});
					// also register a focus listener
				}

				putstr = editor === 'textarea' ? 'textarea' :
					'input[type=' + editor + ']';
				cmp = node = put(putstr + '.dgrid-input', lang.mixin({
					name: column.field,
					tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex
				}, args));

				if (has('ie') < 9) {
					// IE<9 doesn't fire change events for all the right things,
					// and it doesn't bubble.
					var listener;
					if (editor === 'radio' || editor === 'checkbox') {
						// listen for clicks since IE doesn't fire change events properly for checks/radios
						listener = on(cmp, 'click', function (evt) {
							self._handleEditorChange(evt, column);
						});
					}
					else {
						listener = on(cmp, 'change', function (evt) {
							self._handleEditorChange(evt, column);
						});
					}

					if (editOn) {
						// Shared editor handlers are maintained in _editorColumnListeners, since they're not per-row
						this._editorColumnListeners.push(listener);
					}
					else if (this._editorRowListeners) {
						this._editorRowListeners[column.id] = listener;
					}
				}
			}

			if (column.autoSelect) {
				var selectNode = cmp.focusNode || cmp;
				if (selectNode.select) {
					on(selectNode, 'focus', function () {
						// setTimeout is needed for always-on editors on WebKit,
						// otherwise selection is reset immediately afterwards
						setTimeout(function () {
							selectNode.select();
						}, 0);
					});
				}
			}

			return cmp;
		},

		_createSharedEditor: function (column) {
			// Creates an editor instance with additional considerations for
			// shared usage across an entire column (for columns with editOn specified).

			var cmp = this._createEditor(column),
				self = this,
				isWidget = cmp.domNode,
				node = cmp.domNode || cmp,
				focusNode = cmp.focusNode || node,
				reset = isWidget ?
					function () {
						cmp.set('value', cmp._dgridLastValue);
					} :
					function () {
						self._updateInputValue(cmp, cmp._dgridLastValue);
						// Update property again in case we need to revert a previous change
						self._updatePropertyFromEditor(column, cmp);
					};

			function blur() {
				var element = self._activeCell;
				focusNode.blur();

				if (typeof self.focus === 'function') {
					// Dijit form widgets don't end up dismissed until the next turn,
					// so wait before calling focus (otherwise Keyboard will focus the
					// input again).  IE<9 needs to wait longer, otherwise the cell loses
					// focus after we've set it.
					setTimeout(function () {
						self.focus(element);
					}, isWidget && has('ie') < 9 ? 15 : 0);
				}
			}

			function onblur() {
				var parentNode = node.parentNode,
					i = parentNode.children.length - 1,
					options = { alreadyHooked: true },
					cell = self.cell(node);

				// emit an event immediately prior to removing an editOn editor
				on.emit(cell.element, 'dgrid-editor-hide', {
					grid: self,
					cell: cell,
					column: column,
					editor: cmp,
					bubbles: true,
					cancelable: false
				});
				column._editorBlurHandle.pause();
				// Remove the editor from the cell, to be reused later.
				parentNode.removeChild(node);

				if (cell.row) {
					// If the row is still present (i.e. we didn't blur due to removal),
					// clear out the rest of the cell's contents, then re-render with new value.
					put(cell.element, '!dgrid-cell-editing');
					while (i--) {
						put(parentNode.firstChild, '!');
					}
					Grid.appendIfNode(parentNode, column.renderCell(cell.row.data, self._activeValue, parentNode,
						self._activeOptions ? lang.delegate(options, self._activeOptions) : options));
				}

				// Reset state now that editor is deactivated;
				// reset _focusedEditorCell as well since some browsers will not
				// trigger the focusout event handler in this case
				self._focusedEditorCell = self._activeCell = self._activeValue = self._activeOptions = null;
			}

			function dismissOnKey(evt) {
				// Contains logic for reacting to enter/escape keypresses to save/cancel edits.
				// Calls `focusNode.blur()` in cases where field should be dismissed.
				var key = evt.keyCode || evt.which;

				if (key === 27) {
					// Escape: revert + dismiss
					reset();
					self._activeValue = cmp._dgridLastValue;
					blur();
				}
				else if (key === 13 && column.dismissOnEnter !== false) {
					// Enter: dismiss
					blur();
				}
			}

			// hook up enter/esc key handling
			this._editorColumnListeners.push(on(focusNode, 'keydown', dismissOnKey));

			// hook up blur handler, but don't activate until widget is activated
			(column._editorBlurHandle = on.pausable(cmp, 'blur', onblur)).pause();
			this._editorColumnListeners.push(column._editorBlurHandle);

			return cmp;
		},

		_updatePropertyFromEditor: function (column, cmp, triggerEvent) {
			var value,
				id,
				editedRow;

			if (!cmp.isValid || cmp.isValid()) {
				value = this._updateProperty((cmp.domNode || cmp).parentNode,
					this._activeCell ? this._activeValue : cmp._dgridLastValue,
					this._retrieveEditorValue(column, cmp), triggerEvent);

				if (this._activeCell) { // for editors with editOn defined
					this._activeValue = value;
				}
				else { // for always-on editors, update _dgridLastValue immediately
					cmp._dgridLastValue = value;
				}

				if (cmp.type === 'radio' && cmp.name && !column.editOn && column.field) {
					editedRow = this.row(cmp);

					// Update all other rendered radio buttons in the group
					query('input[type=radio][name=' + cmp.name + ']', this.contentNode).forEach(function (radioBtn) {
						var row = this.row(radioBtn);
						// Only update _dgridLastValue and the dirty data if it exists
						// and is not already false
						if (radioBtn !== cmp && radioBtn._dgridLastValue) {
							radioBtn._dgridLastValue = false;
							if (this.updateDirty) {
								this.updateDirty(row.id, column.field, false);
							}
							else {
								// update store-less grid
								row.data[column.field] = false;
							}
						}
					}, this);

					// Also update dirty data for rows that are not currently rendered
					for (id in this.dirty) {
						if (editedRow.id.toString() !== id && this.dirty[id][column.field]) {
							this.updateDirty(id, column.field, false);
						}
					}
				}
			}
		},

		_updateProperty: function (cellElement, oldValue, value, triggerEvent) {
			// Updates dirty hash and fires dgrid-datachange event for a changed value.
			var self = this;

			// test whether old and new values are inequal, with coercion (e.g. for Dates)
			if ((oldValue && oldValue.valueOf()) !== (value && value.valueOf())) {
				var cell = this.cell(cellElement);
				var row = cell.row;
				var column = cell.column;
				// Re-resolve cellElement in case the passed element was nested
				cellElement = cell.element;

				if (column.field && row) {
					var eventObject = {
						grid: this,
						cell: cell,
						oldValue: oldValue,
						value: value,
						bubbles: true,
						cancelable: true
					};
					if (triggerEvent && triggerEvent.type) {
						eventObject.parentType = triggerEvent.type;
					}

					if (on.emit(cellElement, 'dgrid-datachange', eventObject)) {
						if (this.updateDirty) {
							// for OnDemandGrid: update dirty data, and save if autoSave is true
							this.updateDirty(row.id, column.field, value);
							// perform auto-save (if applicable) in next tick to avoid
							// unintentional mishaps due to order of handler execution
							if (column.autoSave) {
								setTimeout(function () {
									self._trackError('save');
								}, 0);
							}
						}
						else {
							// update store-less grid
							row.data[column.field] = value;
						}
					}
					else {
						// Otherwise keep the value the same
						// For the sake of always-on editors, need to manually reset the value
						var cmp;
						if ((cmp = cellElement.widget)) {
							// set _dgridIgnoreChange to prevent an infinite loop in the
							// onChange handler and prevent dgrid-datachange from firing
							// a second time
							cmp._dgridIgnoreChange = true;
							cmp.set('value', oldValue);
							setTimeout(function () {
								cmp._dgridIgnoreChange = false;
							}, 0);
						}
						else if ((cmp = cellElement.input)) {
							this._updateInputValue(cmp, oldValue);
						}

						return oldValue;
					}
				}
			}
			return value;
		},

		_updateInputValue: function (input, value) {
			// summary:
			//		Updates the value of a standard input, updating the
			//		checked state if applicable.

			input.value = value;
			if (input.type === 'radio' || input.type === 'checkbox') {
				input.checked = input.defaultChecked = !!value;
			}
		},

		_retrieveEditorValue: function (column, cmp) {
			// summary:
			//		Intermediary between _convertEditorValue and
			//		_updatePropertyFromEditor.

			if (typeof cmp.get === 'function') { // widget
				return this._convertEditorValue(cmp.get('value'));
			}
			else { // HTML input
				return this._convertEditorValue(
					cmp[cmp.type === 'checkbox' || cmp.type === 'radio' ? 'checked' : 'value']);
			}
		},

		_convertEditorValue: function (value, oldValue) {
			// summary:
			//		Contains default logic for translating values from editors;
			//		tries to preserve type if possible.

			if (typeof oldValue === 'number') {
				value = isNaN(value) ? value : parseFloat(value);
			}
			else if (typeof oldValue === 'boolean') {
				value = value === 'true' ? true : value === 'false' ? false : value;
			}
			else if (oldValue instanceof Date) {
				var asDate = new Date(value);
				value = isNaN(asDate.getTime()) ? value : asDate;
			}
			return value;
		}
	});
});

define('hui/core/icon',{
    onChangeIconProperty: function(newValue) {
        if (this._textField) {
            this._textField.icon = newValue;

            if (!newValue) {
                this.removeAttribute('icon');
            }

            return;
        }

        var icon = this.querySelector('i');

        if (!newValue) {
            if (icon) {
                icon.parentNode.removeChild(icon);
            }

            this.removeAttribute('icon');
        } else {
            if (!icon) {
                icon = this.ownerDocument.createElement('i');

                switch (this.tagName.toLowerCase()) {
                    case 'ha-select':
                        this.querySelector('button').appendChild(icon);
                        break;

                    case 'ha-text-field':
                        this.insertBefore(icon, this.querySelector('input'));
                        break;

                    default:
                        throw new Error('Embedded icon not implemented for ' + this.tagName);
                }
            }

            icon.className = 'hi embedded ' + newValue;
        }
    }
});

define('hui/text-field',[
    'register-component/v2/register',
    './validatable/validatable',
    './core/icon',
    './core/utils',
    './core/deviceUtils',
    './core/keys',
    'object-utils/classes'
], function(register, Validatable, icon, utils, deviceUtils, keys, classes) {
    /*
    * Determine whether we should show the required * or not
    * If we are given a newValue, overwrite the old label string/DOM with it
    * Else recursively search the label's DOM until we find the last word and manipulate it
    * @param  {String} optional if you want to replace your label string and test showing the required indicator
    */
    function handleRequiredIndicator(component, newValue) {
        var label = component.querySelector('label'),
            lastString;

        // recursively walk through the label DOM to find the last work
        function walkLabelDOM(node) {
            if (node.nodeType === 3 && node.textContent.trim() !== '') {
                lastString = node;
            }
            node = node.firstChild;
            while (node) {
                walkLabelDOM(node);
                node = node.nextSibling;
            }
        }

        if (label) {
            if (newValue) {
                // overwrite old label with newValue, toggle * if needed
                label.textContent = utils.toggleSuffixText(newValue, ' *', component.required && !component.noRequiredIndicator);
            } else {
                // start recursion
                walkLabelDOM(label);
                if (lastString) {
                    // if we found the last work in the label DOM, toggle * if needed
                    lastString.textContent = utils.toggleSuffixText(lastString.textContent, ' *', component.required && !component.noRequiredIndicator);
                }
            }
        }
    }

    /**
     * Returns true if the component has an active validation
     * @param  {HTMLElement} component The textfield
     * @return {Boolean}     true if there's at least an active validation
     */
    function validationActive(component) {
        return component.required || !!component.max || !!component.min || !!component.pattern || !!component.minLength || !!component.validator;
    }

    function onChangeMaxMin(newValue, oldValue) {
        if (newValue !== oldValue) {
            this.handleTooltipBinding(validationActive(this));
        }
    }

    var HATextField = classes.createObject(Validatable, {

        init: function _() {

            _.super(this);

            /**
             * Flag to check if listeners were already added to component
             * @type {Boolean}
             */
            this._validationListenersAdded = false;

            this._label = null;

            /**
             * The element that the validator will use to get the values to validate
             * @type {HTMLElement}
             */
            this.validationTarget = this;

            /**
             * The selector for the elements to highlight if an error is detected
             * @type {String}
             */
            this.highlightElementSelector = 'input';

            this._customValidatorFunction = null;

            /**
             * An array of the component's supported classes - these
             * should not be overwritten during any props change to the
             * React component. They were determined by grepping classList.add()
             * and classList.remove() for this component.
             *
             * Please see updateClassWithProps() of utils.js for more information.
             * @type{Array}
             */
            this.supportedClasses = [
                'mobile-text-field',
                'mobile-text-field-focused',
                'mobile-text-field-attachment-focused',
                'mobile-text-field-show-placeholder',
                'mobile-text-field-content',
                'disabled',
                'ha-validatable'
            ];

            this.setupProperties({
                optional: {
                    default: false,
                    type: Boolean,
                    change: function(newValue) {
                        if (newValue) {
                            this.required = false;
                        }
                        var spanOptional,
                            label = this.querySelector('label');

                        if (label) {
                            spanOptional = label.querySelector('span.optional');

                            if (newValue) {
                                if (!spanOptional) {
                                    spanOptional = this.ownerDocument.createElement('span');
                                    spanOptional.className = 'optional';
                                    label.appendChild(spanOptional);
                                    spanOptional.innerHTML = ' ' + this.labelOptional;
                                }
                            } else {
                                if (spanOptional) {
                                    label.removeChild(spanOptional);
                                }
                            }
                        }
                    }
                },

                /**
                 * Declares the text that will be used to describe optional fields
                 * @type {String}
                 */
                labelOptional: {
                    default: 'optional',
                    change: function(newValue) {
                        var labelOptional = this.querySelector('.optional');

                        if (this.optional && labelOptional) {
                            labelOptional.innerHTML = ' ' + newValue;
                        }
                    }
                },

                /**
                 * Sets the name for the text input
                 * @type {String}
                 */
                name: {
                    default: '',
                    change: function(newValue) {
                        var input = this.querySelector('input'),
                            fileInput = this.querySelector('input[type="file"]');

                        if (newValue) {
                            if (fileInput) {
                                fileInput.name = newValue;
                                input.removeAttribute('name');
                            } else {
                                input.name = newValue;
                            }
                        } else {
                            input.removeAttribute('name');
                            if (fileInput) {
                                fileInput.removeAttribute('name');
                            }
                        }
                    }
                },

                /**
                 * Sets the autoComplete for the text input
                 * @type {String}
                 */
                autoComplete: {
                    default: 'on',
                    change: function(newValue) {
                        this.querySelector('input').autocomplete = newValue;
                    }
                },

                /**
                 * Sets the size for the text input
                 * @type {Number}
                 */
                size: {
                    default: 20,
                    type: Number,
                    change: function(newValue) {
                        this.querySelector('input').size = newValue;
                    }
                },

                /**
                 * Placeholder for the text-field control
                 * @type {String}
                 */
                placeholder: {
                    default: '',
                    change: function(newValue) {
                        var input = this.querySelector('input');

                        input.placeholder = newValue;

                        if (!this.label) {
                            if (!this.ariaLabel) {
                                input.setAttribute('aria-label', newValue);
                            }
                        }

                        // clean up attributes
                        if (!newValue) {
                            if (input.hasAttribute('aria-label')) {
                                input.removeAttribute('aria-label');
                            }
                            if (input.hasAttribute('placeholder')) {
                                input.removeAttribute('placeholder');
                            }
                        }
                    }
                },

                /**
                 * The name of a Harmony icon to display within the component
                 * @type {string}
                 */
                icon: {
                    default: '',
                    type: String,
                    change: icon.onChangeIconProperty
                },

                /**
                 * Disabled indicates whether the field is disabled
                 * @type {Boolean}
                 */
                disabled: {
                    default: false,
                    type: Boolean,
                    change: function(newValue) {
                        this.querySelector('input').disabled = newValue;

                        if (newValue) {
                            this.classList.add('disabled');
                        } else {
                            this.classList.remove('disabled');
                        }
                    }
                },

                /**
                 * noRequiredIndicator indicates whether '*' should be
                 * appended to the label when the field is required
                 * @type {Boolean}
                 */
                noRequiredIndicator: {
                    default: false,
                    type: Boolean,
                    change: function(newValue, oldValue) {
                        if (newValue !== oldValue) {
                            handleRequiredIndicator(this);
                        }
                    }
                },

                /**
                 * required indicates whether the field is optional
                 * @type {Boolean}
                 */
                required: {
                    default: false,
                    type: Boolean,
                    change: function(newValue, oldValue) {
                        var input = this.querySelector('input');

                        if (newValue) {
                            this.optional = false;
                        }
                        if (newValue !== oldValue) {
                            handleRequiredIndicator(this);

                            if (newValue) {
                                _addValidationListeners(this, input);
                            } else {
                                _removeValidationListeners(this, input);
                            }
                            this.handleTooltipBinding(validationActive(this));

                            input.required = newValue;
                            input.setAttribute('aria-required', newValue);
                        }
                    }
                },

                /**
                 * Specifies the maximum number of characters that the user can enter
                 * @type {Number}
                 */
                maxLength: {
                    default: 524288,
                    type: Number,
                    change: function(newValue) {
                        this.querySelector('input').maxLength = newValue;
                    }
                },

                /**
                 * Specifies the minimum length required for the field to verify
                 * @type {Number}
                 */
                minLength: {
                    default: 0,
                    type: Number,
                    change: function(newValue) {
                        var input = this.querySelector('input');

                        if (newValue) {
                            input.minLength = newValue;
                            input.setAttribute('minLength', newValue);
                            _addValidationListeners(this, input);
                        } else {
                            input.removeAttribute('minLength');
                            input.minLength = 0;
                            _removeValidationListeners(this, input);
                        }
                    }
                },

                /**
                 * Specifies the pattern the value should match
                 * @type {String}
                 */
                pattern: {
                    default: '',
                    change: function(newValue) {
                        var input = this.querySelector('input');

                        if (newValue) {
                            input.pattern = newValue;
                            _addValidationListeners(this, input);
                        } else {
                            input.removeAttribute('pattern');
                            _removeValidationListeners(this, input);
                        }
                    }
                },

                min: {
                    change: this._onChangeMin
                },

                max: {
                    change: this._onChangeMax
                },

                /**
                 * Specifies the height of this component's input element in pixels
                 * @type {number}
                 * @default 34
                 */
                mobileMaxHeight: {
                    type: Number,
                    default: 34,
                    change: function(newValue) {
                        if (deviceUtils.isHandheld()) {
                            if (this.classList.contains('mobile-text-field-focused')) {
                                this._inputElement.style.height = newValue + 'px';
                            } else {
                                if (this.value) {
                                    this._previousHeight = Math.min(this.mobileMaxHeight, this._getDefaultHeight(this.value) + 15) + 'px';
                                }

                                this._inputElement.style.height = this._previousHeight || '';
                            }
                        }
                    }
                },

                attachment: {
                    type: Boolean,
                    change: function(newValue) {
                        if (newValue) {
                            this._setUpAttachmentField();
                        } else {
                            this._removeAttachmentField();
                        }
                    }
                },

                type: {
                    type: String,
                    default: 'text',
                    change: function(newValue) {
                        var input = this.querySelector('input');

                        if (!this.attachment) {
                            input.setAttribute('type', newValue ? newValue : 'text');
                        }
                    }
                },

                /**
                 * This is the arialabel property for the ha-text-field.
                 * ariaLabel takes precedence over label property at any time.
                 * @type {String}
                 */
                ariaLabel: {
                    default: '',
                    change: function(newValue) {
                        var textFieldChildInput = this.querySelector('input');
                        if (textFieldChildInput) {
                            if (newValue) {
                                textFieldChildInput.setAttribute('aria-label', newValue);
                            } else {
                                if (!textFieldChildInput.placeholder) {
                                    textFieldChildInput.removeAttribute('aria-label');
                                }
                            }
                        }
                    }
                }
            });

            // @FIXME We need to reset this object for every instance.
            // It seems that the extend function makes the parent properties
            // work as static properties. Some research is needed here.
            this._validationData = {};

        },

        postRender: function _() {
            _.super(this);

            var input = this.querySelector('input'),
                haLabel = this.querySelector('ha-label'),
                attributeValue,
                labelAttributeValue;

            if (!input) {
                input = this.ownerDocument.createElement('input');
                input.className = 'ha-input';
                this.appendChild(input);
            }

            if (deviceUtils.isHandheld()) {
                this.classList.add('mobile-text-field');

                // Only add immediate focus utils if iOS 9
                deviceUtils.addiOS9ImmediateFocus();

                this.listenTo(input, 'focus', function() {
                    this.classList.add('mobile-text-field-focused');
                    input.style.height = this.mobileMaxHeight + 'px';
                }.bind(this));

                this.listenTo(input, 'blur', function() {
                    this.classList.remove('mobile-text-field-focused');
                    input.style.height = this._previousHeight || '';
                }.bind(this));
            }

            input.id = 'ha-text-field-' + this.componentId;
            this.highlightElement = input;

            // if declarative instantiation has an attribute, sync to the this.value
            attributeValue = this.getAttribute('value');
            if (attributeValue) {
                // lets sync the attribute "value" to the component "value" property which then sets to the local input
                this.value = attributeValue;
                if (deviceUtils.isHandheld()) {
                    this.classList.add('mobile-text-field-content');
                }
            }

            labelAttributeValue = this.getAttribute('label');
            if (!haLabel) {
                if (labelAttributeValue) {
                    // lets sync the attribute "label" to the component "label" property which then sets to the local input
                    this.label = labelAttributeValue;
                }
            } else {
                this.label = Array.prototype.slice.call(haLabel.childNodes);
            }

            // this assures while typing, the local input.value is copied to the host this.value
            this.listenTo(input, 'input', function(evt) {
                evt.stopPropagation();
                this.value = evt.target.value;
                // this makes sure the evt.target is the host component
                this.emit('input');
            }.bind(this));

            //This event listeners are created for preventing the change and click events to bubble up.
            this.listenTo(input, 'change', function(evt) {
                evt.stopPropagation();
                // this makes sure the evt.target is the host component
                if (this.value && deviceUtils.isHandheld()) {
                    this.classList.add('mobile-text-field-content');
                } else {
                    this.classList.remove('mobile-text-field-content');
                }
                this.emit('change');
            }.bind(this));

            this.listenTo(input, 'blur', function() {
                this.emit('blur');
            }.bind(this));

            this.listenTo(input, 'focus', function() {
                this.emit('focus');
            }.bind(this));

            this.listenTo(input, 'invalid', function(evt) {
                // stop default messages
                evt.preventDefault();
            });

            this.listenTo(input, 'click', function(evt) {
                var fileInput = this.querySelector('input[type="file"]');
                if (fileInput) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    fileInput.click();
                }
            }.bind(this));

            this.listenTo(this, 'input[type="file"]:change', function(evt) {
                var fullPath = evt.target.value,
                    startIndex,
                    filename;
                if (fullPath) {
                    startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
                    filename = fullPath.substring(startIndex);
                    if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
                        filename = filename.substring(1);
                    }
                    input.value = filename;
                    if (deviceUtils.isHandheld()) {
                        this.classList.add('mobile-text-field-content');
                    }
                }
            }.bind(this));

            this.listenTo(input, 'keydown', function(evt) {
                if (this.attachment) {
                    evt.preventDefault();
                    if (evt.keyCode === keys.BACKSPACE || evt.keyCode === keys.DELETE) {
                        input.value = '';
                        this.classList.remove('mobile-text-field-content');
                        var fileInput = this.querySelector('input[type="file"]'),
                            clone,
                            parent;
                        if (fileInput) {
                            clone = fileInput.cloneNode(true);
                            parent = fileInput.parentNode;
                            parent.removeChild(fileInput);
                            parent.appendChild(clone);
                        }
                    }
                }
            }.bind(this));

            this._setUpMobileListeners();
            // This is separate because date-picker needs unique logic
            this.listenTo(input, 'blur', function() {
                this.classList.remove('mobile-text-field-focused');
                this.classList.remove('mobile-text-field-attachment-focused');
                this.classList.remove('mobile-text-field-show-placeholder');
            }.bind(this));
        },

        /**
         * This is exposed as a protected method so that sub-classes can extend it
         * @protected
         */
        _onChangeMax: onChangeMaxMin,

        /**
         * This is exposed as a protected method so that sub-classes can extend it
         * @protected
         */
        _onChangeMin: onChangeMaxMin,

        /**
         * Search in the target defined the component that will check the validity.
         * @argument {Event} event
         * @private
         */
        _reportValidity: function(event) {
            var textField = utils.getComponentFromElement(event.target, this.tagName);
            if (textField) {
                textField.reportValidity(event);
            }
        },

        startValidation: function() {
            _addValidationListeners(this);
        },

        stopValidation: function() {
            _removeValidationListeners(this);
        },

        /**
         * Reusable function for setting up mobile listeners. It's directly
         * called in this class, but subclasses(e.g date-picker) may not want
         * all of the events in this class but may still want mobile events.
         * @private
         */
        _setUpMobileListeners: function() {
            var input = this.querySelector('input');
            this.listenTo(input, 'focus', function() {
                if (deviceUtils.isHandheld()) {
                    if (!this.attachment) {
                        this.classList.add('mobile-text-field-focused');
                        input.style.height = '34px';
                    } else {
                        this.classList.add('mobile-text-field-attachment-focused');
                    }
                }
            }.bind(this));

            this.listenTo(input, 'blur', function() {
                if (deviceUtils.isHandheld()) {
                    if (!this.attachment) {
                        this.classList.remove('mobile-text-field-focused');
                        input.style.height = this._previousHeight || '';
                    } else {
                        this.classList.remove('mobile-text-field-attachment-focused');
                    }
                }
            }.bind(this));
        },

        _removeAttachmentField: function() {
            var fileInput = this.querySelector('input[type="file"]'),
                inputParent,
                input = this.querySelector('input'),
                label = this.querySelector('label'),
                name = this.name;
            if (fileInput) {
                if (this.icon === 'hi-attach') {
                    this.icon = '';
                }
                inputParent = fileInput.parentNode;
                inputParent.parentNode.removeChild(inputParent);
            }
            if (input) {
                input.removeAttribute('aria-hidden');
            }
            if (label) {
                label.removeAttribute('aria-hidden');
            }
            // Reset name to switch it to the appropriate input
            this.name = '';
            this.name = name;
        },

        _setUpAttachmentField: function() {
            var fileInput,
                fileInputLabel,
                fileInputId,
                inputParent,
                name = this.name,
                input,
                label,
                icon;

            fileInput = this.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.parentNode.parentNode.removeChild(fileInput.parentNode);
            }
            if (this.icon !== 'hi-attach') {
                this.icon = 'hi-attach';
            }
            input = this.querySelector('input');
            label = this.querySelector('label');
            fileInputId = input.id + '-file-upload';
            icon = this.querySelector('.hi-attach');

            // Hide existing content from screen reader
            if (label) {
                label.setAttribute('aria-hidden', 'true');
            }
            input.setAttribute('aria-hidden', 'true');
            icon.setAttribute('aria-hidden', 'true');

            fileInput = document.createElement('input');
            fileInput.setAttribute('type', 'file');
            fileInput.setAttribute('id', fileInputId);

            inputParent = document.createElement('div');
            inputParent.classList.add('ha-textfield-file-input-container');
            inputParent.classList.add('sr-only');
            if (label) {
                fileInputLabel = document.createElement('label');
                fileInputLabel.innerHTML = label.innerHTML;
                fileInputLabel.setAttribute('for', fileInputId);
                inputParent.appendChild(fileInputLabel);
            }
            inputParent.appendChild(fileInput);
            this.appendChild(inputParent);
            // Reset name to switch it to the appropriate input
            this.name = '';
            this.name = name;
        },

        // we added get/set value and attributeChangedCallback for value instead of using
        // setupProperties because when user types in a value we use the input event to
        // hydrate the this.value property when we are typing at the middle of a text,
        // the cursor is set back to the end because the change observer reset local input value
        get value() {
            return this.querySelector('input').value;
        },

        set value(newValue) {
            var input = this.querySelector('input'),
                isHandheld = deviceUtils.isHandheld();

            if (typeof (newValue) === 'number') {
                newValue = newValue + '';
                if (newValue && isHandheld) {
                    this.classList.add('mobile-text-field-content');
                } else {
                    this.classList.remove('mobile-text-field-content');
                }
            }

            // sync the newValue to the local input value if they are different
            if (newValue !== this.value) {
                this.querySelector('input').value = newValue;
            }

            // if empty we just remove the attribute
            if (!newValue) {
                this.removeAttribute('value');
                if (isHandheld) {
                    this.classList.remove('mobile-text-field-content');
                    this._previousHeight = '';
                    if (!this.classList.contains('mobile-text-field-focused')) {
                        input.style.height = '';
                    }
                }
            } else {
                if (newValue !== this.getAttribute('value')) {
                    // sync the newValue to the host attribute "value" if they are different
                    this.setAttribute('value', newValue);
                }
            }

            this._calculateMobileHeight(newValue);
        },

        _calculateMobileHeight: function(newValue) {
            var input = this.querySelector('input'),
                isHandheld = deviceUtils.isHandheld();

            if (isHandheld) {
                if (!newValue) {
                    this._previousHeight = '';

                    if (!this.classList.contains('mobile-text-field-focused')) {
                        input.style.height = '';
                    }
                } else {
                    this.classList.add('mobile-text-field-content');
                    // Get the height. Add 15 px to the offsetHeight of the div to account for padding
                    this._previousHeight = Math.min(this.mobileMaxHeight, this._getDefaultHeight(newValue) + 15) + 'px';
                    if (!this.classList.contains('mobile-text-field-focused')) {
                        input.style.height = this._previousHeight;
                    }
                }
            }
        },

        get validator() {
            return this._customValidatorFunction;
        },

        set validator(newValue) {
            if (newValue && newValue !== this.validator) {
                this._customValidatorFunction = newValue;
                this.startValidation();
            } else if (!newValue) {
                this._customValidatorFunction = null;
                this.stopValidation();
            }
        },

        get _inputElement() {
            return this.querySelector('input');
        },

        set label(newValue) {
            var input = this.querySelector('input'),
                label = this.querySelector('label'),
                haLabel = this.querySelector('ha-label'),
                isNode;

            if (newValue) {
                isNode = Array.isArray(newValue) || newValue.nodeType === 1;
                if (typeof newValue === 'string') {
                    // if ha-label left from element value, remove <ha-label>
                    if (haLabel) {
                        this.removeChild(haLabel);
                        // recheck label existance because it may have been removed with ha-label
                        label = this.querySelector('label');
                    }

                    // if no label element create it and add it to text-field
                    if (!label) {
                        label = this.ownerDocument.createElement('label');
                        this.insertBefore(label, input);
                    }
                    label.htmlFor = input.id;
                    // toggle * if needed, and add label text to label element
                    handleRequiredIndicator(this, newValue);

                    // sync label attribute
                    this.setAttribute('label', newValue);
                } else if (isNode) {
                    // remove label attribute first
                    if (this.hasAttribute('label')) {
                        this.removeAttribute('label');
                    }

                    label = this.querySelector('label');
                    // if label left inside <ha-label> remove <ha-label>, else remove <label>
                    if (label && !haLabel) {
                        this.removeChild(label);
                    } else if (haLabel) {
                        this.removeChild(haLabel);
                    }

                    label = this.ownerDocument.createElement('label');
                    haLabel = this.ownerDocument.createElement('ha-label');
                    newValue = Array.isArray(newValue) ? newValue : [newValue];

                    newValue.forEach(function(node) {
                        label.appendChild(node);
                    });

                    haLabel.appendChild(label);
                    this.insertBefore(haLabel, this.firstElementChild);

                    // toggle * if needed
                    handleRequiredIndicator(this);
                }
                // make sure we don't have aria-label since we have label
                if (!this.ariaLabel) {
                    if (input.hasAttribute('aria-label')) {
                        input.removeAttribute('aria-label');
                    }
                }
            } else {
                // if falsy empty string, null or undefined

                // remove label attribute
                if (this.hasAttribute('label')) {
                    this.removeAttribute('label');
                }

                label = this.querySelector('label');
                haLabel = this.querySelector('ha-label');

                // remove <ha-label> if it exists
                if (haLabel) {
                    this.removeChild(haLabel);
                } else if (label) {  // otherwise just remove <label>
                    this.removeChild(label);
                }

                // if we don't have a label and we have a placeholder, set aria-label
                if (input.placeholder) {
                    if (!this.ariaLabel) {
                        input.setAttribute('aria-label', input.placeholder);
                    }
                }
            }

            this._label = newValue;
            if (this.attachment) {
                this._setUpAttachmentField();
            }
        },

        get label() {
            return this._label;
        },

        attributeChangedCallback: function _(attrName, oldValue, newValue) {
            // happens when we modify the attribute via browser inspector or via setAttribute
            if (attrName === 'value') {
                // call the value setter which handles the logic
                // put guard here to prevent value double setting,
                // the null guard condition is polyfill for IE11 since empty value will be null.
                if (this.value !== newValue && newValue !== null) {
                    this.value = newValue;
                }
            } else if (attrName === 'label') {
                this.label = newValue;
            } else {
                _.super(this, attrName, oldValue, newValue);
            }
        },

        /**
         * Calling on the focus method should in turn focus on the internal text field
         * @method focus
         * @public
         */
        focus: function() {
            this._inputElement.focus();
        },

        /**
         * Calling on the blur method should in turn blur on the internal text field
         * @method blur
         * @public
         */
        blur: function() {
            this._inputElement.blur();
        },

        /*
         * Calculate the default height of a node with the provided content,
         * taking into consideration the component's 'mobileMaxHeight' property.
         */
        _getDefaultHeight: function(content) {
            var nodeStyles = getComputedStyle(this._inputElement),
                div,
                defaultHeight;

            content = String(content || '');
            div = this.ownerDocument.createElement('div');
            div.style.fontSize = nodeStyles.fontSize;
            div.style.whiteSpace = 'pre-wrap';
            div.style.wordBreak = 'break-all';
            div.style.fontFamily = nodeStyles.fontFamily;
            div.style.width = nodeStyles.width;
            div.style.maxHeight = this.mobileMaxHeight + 'px';
            div.style.position = 'absolute';
            div.style.top = '-44px';
            div.style.left = '-' + (parseInt(nodeStyles.width, 10) + 10) + 'px';
            div.textContent = content.endsWith('\n') ? (content + '_') : content;
            this.ownerDocument.body.appendChild(div);
            defaultHeight = div.offsetHeight;
            this.ownerDocument.body.removeChild(div);

            return defaultHeight;
        }
    });

    /**
     * Add the event listeners needed for the component
     * @param {HTMLElement} component context defined
     * @private
     */
    function _addValidationListeners(component) {
        var input = component.querySelector('input');
        if (!component._validationListenersAdded) {
            component._boundValidator = component._reportValidity.bind(component);
            component.listenTo(input, 'mouseenter', component._boundValidator);
            component.listenTo(input, 'mouseout', component._boundValidator);
            component.listenTo(input, 'focus', component._boundValidator);
            component.listenTo(input, 'blur', component._boundValidator);
            component.listenTo(input, 'keyup', component._boundValidator);
            component.listenTo(component, '.ha-icon-alert:mouseover', component._boundValidator);
            component.listenTo(component, '.ha-icon-alert:mouseout', component._boundValidator);
            component.classList.add('ha-validatable');
            component._validationListenersAdded = true;
        }
    }

    /**
     * Remove all the event listeners for the component
     * @param {HTMLElement} component context defined
     * @private
     */
    function _removeValidationListeners(component) {
        var input = component.querySelector('input');
        if (!utils.validationRequired(component) && component._validationListenersAdded) {
            component.stopListening(input, 'mouseenter', component._boundValidator);
            component.stopListening(input, 'mouseout', component._boundValidator);
            component.stopListening(input, 'focus', component._boundValidator);
            component.stopListening(input, 'blur', component._boundValidator);
            component.stopListening(input, 'keyup', component._boundValidator);
            component.stopListening(component, '.ha-icon-alert:mouseover', component._boundValidator);
            component.stopListening(component, '.ha-icon-alert:mouseout', component._boundValidator);
            component.classList.remove('ha-validatable');
            component._validationListenersAdded = false;
        }
    }

    return register('ha-text-field', HATextField);
});

/**
 * @external dgrid/Editor
 * @see https://github.com/SitePen/dgrid/blob/dev-0.4/doc/components/mixins/Editor.md
 */

/**
 * @module
 * @class Editor
 * @extends dgrid/Editor
 * Extends the Editor functionality built into dgrid to support toggling
 * specific columns as editable
 *
* This module is automatically mixed into the dgrid instance created in
* TableBase.factory
 */
define('hui/table/Editor',[
    'dojo/_base/declare',
    'dgrid/Editor',
    'dojo/on',
    '../text-field'
], function(declare, Editor, on) {
    return declare(Editor.extend({
        /**
         * Creates an editor instance based on column definition properties,
         * and hooks up events.
         * @param {Object} column - the column definition
         * @override
         * @private
         */
        _createEditor: function(column) {
            var editorType = column.editor,
                self = this,
                editor;

            if (!this._hasInputListener) {
                // register one listener at the top level that receives events delegated
                this._hasInputListener = true;
                this.on('change', function(event) {
                    self._handleEditorChange(event, column);
                });
            }

            editor = document.createElement(editorType);
            editor.classList.add('dgrid-input');
            editor.name = column.field;
            editor.tabIndex = isNaN(column.tabIndex) ? -1 : column.tabIndex;
            if (editorType === 'ha-text-field') {
                editor.ariaLabel = column.label;
            } else {
                editor.setAttribute('aria-label', column.label);
            }
            // TODO: will this ever be true for ha-text-field?
            /* istanbul ignore if */
            if (column.autoSelect && editor.select) {
                editor.addEventListener('focus', function() {
                    // setTimeout is needed for always-on editors on WebKit,
                    // otherwise selection is reset immediately afterwards
                    setTimeout(function() {
                        editor.select();
                    }, 0);
                });
            }

            return editor;
        },

        /**
         * Configure the editable columns
         * @return {Array} - the columns array
         * @override
         * @private
         */
        _configColumns: function() {
            var columnArray = this.inherited(arguments);
            this._alwaysOnWidgetColumns = [];
            columnArray.forEach(function(column) {
                if (this.editable && column.editor) {
                    this._configureEditorColumn(column);
                } else {
                    column.renderCell = column._originalRenderCell || column.renderCell;
                }
            }.bind(this));
            return columnArray;
        },

        /**
         * Override the renderCell method for columns that are editable.
         * This method is overwritten from dgrid in order to provide support for setting custom elements
         * such as hui components as the editor types
         * @param {Object} column - the column definition to configure the editor on
         * @override
         * @private
         */
        _configureEditorColumn: function(column) {
            var editor = column.editor,
                self = this,
                editOn = column.editOn,
                originalRenderCell = column.renderCell || this._defaultRenderCell,
                isWidget = typeof editor !== 'string';

            /* istanbul ignore else */
            if (editOn) {
                this._editorInstances[column.id] = this._createSharedEditor(column, originalRenderCell);
            } else if (isWidget) {
                this._alwaysOnWidgetColumns.push(column);
            }

            column._originalRenderCell = column._originalRenderCell || originalRenderCell;

            column.renderCell = editOn ? function(object, value, cell, options) {
                if (!options || !options.alreadyHooked) {
                    self._editorColumnListeners.push(
                        on(cell, editOn, function() {
                            self._activeOptions = options;
                            self.edit(this);
                        })
                    );
                }
            } : function(object, value, cell, options) {
                if (self._isEditable(column.field) && (!column.canEdit || column.canEdit(object, value))) {
                    var cmp = self._createEditor(column);
                    self._showEditor(cmp, column, cell, value);
                    cell[isWidget ? 'widget' : 'input'] = cmp;
                } else {
                    return originalRenderCell.call(column, object, value, cell, options);
                }
            }.bind(this);
        },

        /**
         * This method is overwritten from the dgrid Editor code in order to propoerly support
         * hui components, which currently do not emit their own events, such as ha-text-field
         * @param {Event} event - The event object
         * @param {Object} column - The column definition
         * @override
         * @private
         */
        _handleEditorChange: function(event, column) {
            var target = event.target;

            if ('_dgridLastValue' in target && target.classList.contains('dgrid-input')) {
                this._updatePropertyFromEditor(column || this.cell(target).column, target, event);
            }
        }
    }), {
        /**
         * Setter method for the editable property. When this property is changed,
         * update the table to display the appropriate editable fields based on the configuration.
         * @param {Boolean} editable - the new value for the editable property
         * @private
         */
        _setEditable: function(editable) {
            var oldValue = this.editable;
            this.editable = editable;
            if (typeof this.editableFields === 'undefined') {
                this.editableFields = this.getAvailableEditableFields();
            }
            if (oldValue !== editable) {
                this._configEditMode();
            }
        },

        /**
         * Return the available editable fields, based on the column definition and which
         * definitions provide an 'editor' property.
         * @return {String[]} - the array of field names that are editable
         */
        getAvailableEditableFields: function() {
            var editableFields = [];
            Object.keys(this.columns).forEach(function(id) {
                var column = this.columns[id];
                if (column.editor) {
                    editableFields.push(column.field);
                }
            }.bind(this));

            return editableFields;
        },

        /**
         * The setter method for the editMode property.
         * When this property is changed, this method triggers a table refresh to
         * properly render the editable fields
         * @private
         */
        _setEditMode: function(mode) {
            var oldValue = this.editMode;
            this.editMode = mode;
            if (oldValue !== mode) {
                this._configEditMode();
            }
        },

        /**
         * Determine whether a field is editable by its name.
         * A field is editable if it has defined an editor, and the table's editable property is true,
         * and whether its field name is prevent in the editableFields array when the editMode is 'specific'
         * @param {String} field - the field to check whether it is editable or not
         * @return {Boolean} - whether the field is editable
         * @private
         */
        _isEditable: function(field) {
            return this.editable && this.getAvailableEditableFields().indexOf(field) > -1 && (this.editMode !== 'specific' || (this.editableFields && this.editableFields.indexOf(field) > -1));
        },

        /**
         * Helper method for reconfiguring the table for edit mode, either enabling or disabling it
         * @private
         */
        _configEditMode: function() {
            this.configStructure();
            this.refresh();
        },

        _showEditor: function(cmp, column, cellElement, value) {
            if (column.editorInit) {
                column.editorInit(cmp, value, column);
            }
            return this.inherited(arguments);
        }
    });
});

/**
 * @module
 * @class RowStatusIndicator
 * Add a row status to the rendered row
 *
 * This module is automatically mixed into the dgrid instance
 * created in TableBase.factory
 */
define('hui/table/RowStatusIndicator',['dojo/_base/declare'], function(declare) {
    return declare(null, {
        /**
         * Add a row status to the rendered row, if applicable
         * @param {Objet} obj - The object for the corresponding row to be generated
         */
        renderRow: function(obj) {
            var row = this.inherited(arguments),
                status;
            if (this.rowStatus) {
                if (typeof this.rowStatus === 'string') {
                    status = obj[this.rowStatus];
                } else if (typeof this.rowStatus === 'function') {
                    status = this.rowStatus(obj);
                }

                if (status === 'error') {
                    row.classList.remove('success');
                    row.classList.remove('warning');
                    row.classList.add('error');
                } else if (status === 'success') {
                    row.classList.remove('error');
                    row.classList.remove('warning');
                    row.classList.add('success');
                } else if (status === 'warning') {
                    row.classList.remove('error');
                    row.classList.remove('success');
                    row.classList.add('warning');
                } else {
                    row.classList.remove('success');
                    row.classList.remove('error');
                    row.classList.remove('warning');
                }
            }

            return row;
        }
    });
});

/**
 * @module
 * @class RowErrors
 * This mixin provides the ability to set errors on individual rows and
 * provides an API for when to show them
 *
 * This module is automatically mixed into the dgrid instance
 * created in TableBase.factory
 */
define('hui/table/RowErrors',[
    'dojo/_base/declare',
    'dojo/_base/lang'
], function(declare, lang) {
    return declare(null, {
        _rowErrors: null,

        postMixInProperties: function() {
            this.inherited(arguments);
            this._rowErrors = {};
        },

        /**
         * Set the default error renderer
         * @param {String|Object|HTMLElement} error - The error to set
         * @param {HTMLElement} rowContent - the row contents to wrap with the error message
         * @return {HTMLElement} - the row element to render
         */
        renderRowError: function(error, rowContent) {
            if (!error) {
                return rowContent;
            }

            var errorDiv = document.createElement('div'),
                alertIconSpan = document.createElement('span'),
                alertContent,
                row = document.createElement('div');

            alertIconSpan.classList.add('hi-circle-alert');
            alertIconSpan.classList.add('hi');

            if (typeof error === 'string') {
                alertContent = document.createElement('span');
                alertContent.textContent = error;
            } else if (error instanceof HTMLElement) {
                alertContent = error;
            }

            errorDiv.appendChild(alertIconSpan);
            if (alertContent) {
                errorDiv.appendChild(alertContent);
            }

            row.classList.add('dgrid-row-alert');
            row.appendChild(errorDiv);
            row.appendChild(rowContent);

            return row;
        },

        /**
         * A wrapper around setErrors
         * @see setErrors
         * @param {_Row} target - the target row to add a message to
         * @param {String} message - the error message to display
         */
        setError: function(target, message) {
            this.setErrors([target], [message]);
        },

        /**
         * Set errors on the given targets
         * @param {_Row[]} targets - the target row to add a message to
         * @param {String[]} errors - the error message to display
         */
        setErrors: function(targets, errors) {
            var i, row, rowId, error, self = this;

            if (targets && errors) {
                for (i = 0; i < targets.length; i++) {
                    row = targets[i] ? this.row(targets[i]) : null;
                    rowId = row ? row.id : null;
                    error = errors[i];
                    if (rowId && error) {
                        this._rowErrors[rowId] = error;
                        this.reRenderRow(row);
                    }
                }
            } else if (targets && typeof targets === 'object') {
                lang.mixin(this._rowErrors, targets);
                Object.keys(targets).forEach(function(rowId) {
                    self.reRenderRow(rowId);
                });
            }
        },

        /**
         * Clear the errors when the selection is cleared
         */
        clearSelection: function() {
            this.clearErrors();
            return this.inherited(arguments);
        },

        /**
         * Remove an error message from a target row
         * @see clearErrors
         * @param {_Row} target - the row to remove the error message from
         */
        clearError: function(target) {
            this.clearErrors([target]);
        },

        /**
         * Clear errros from the targets
         * @param {_Row[]} targets - the rows to remove error messages from
         */
        clearErrors: function(targets) {
            if (!targets) {
                this._rowErrors = {};
                this.refresh({
                    keepCurrentPage: true,
                    keepScrollPosition: true
                });
            } else {
                var rowErrors = this._rowErrors,
                    self = this;
                targets.forEach(function(target) {
                    var row = target ? self.row(target) : null,
                        rowId = row ? row.id : null;
                    if (rowId && rowErrors[rowId]) {
                        rowErrors[rowId] = undefined;
                        self.reRenderRow(row);
                    }
                });
            }
        },

        /**
         * Render the row and any associated error messages if applicable
         * @param {Object} object - the row object to render
         * @return {HTMLElement} - the row element
         */
        renderRow: function(object) {
            var row = this.inherited(arguments),
                error = this._rowErrors[this.collection.getIdentity(object)];

            if (error) {
                return this.renderRowError(error, row);
            }

            return row;
        }
    });
});

define('dgrid-0.4/Selector',[
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/_base/sniff',
	'./Selection',
	'put-selector/put'
], function (declare, lang, has, Selection, put) {

	return declare(Selection, {
		// summary:
		//		Adds an input field (checkbox or radio) to a column that when checked, selects the row
		//		that contains the input field.  To enable, add a "selector" property to a column definition.
		//
		// description:
		//		The selector property should contain "checkbox", "radio", or be a function that renders the input.
		//		If set to "radio", the input field will be a radio button and only one input in the column will be
		//		checked.  If the value of selector is a function, then the function signature is
		//		renderSelectorInput(column, value, cell, object) where:
		//		* column - the column definition
		//		* value - the cell's value
		//		* cell - the cell's DOM node
		//		* object - the row's data object
		//		The custom renderSelectorInput function must return an input field.

		postCreate: function () {
			this.inherited(arguments);

			// Register one listener at the top level that receives events delegated
			this.on('.dgrid-selector:click,.dgrid-selector:keydown', lang.hitch(this, '_handleSelectorClick'));
			// Register listeners to the select and deselect events to change the input checked value
			this.on('dgrid-select', lang.hitch(this, '_changeSelectorInput', true));
			this.on('dgrid-deselect', lang.hitch(this, '_changeSelectorInput', false));
		},

		_defaultRenderSelectorInput: function (column, selected, cell, object) {
			var parent = cell.parentNode;
			var grid = column.grid;

			// Must set the class name on the outer cell in IE for keystrokes to be intercepted
			put(parent && parent.contents ? parent : cell, '.dgrid-selector');
			var input = cell.input || (cell.input = put(cell, 'input[type=' + column.selector + ']', {
				tabIndex: isNaN(column.tabIndex) ? -1 : column.tabIndex,
				disabled: !grid.allowSelect(grid.row(object)),
				checked: selected
			}));
			input.setAttribute('aria-checked', selected);

			return input;
		},

		_configureSelectorColumn: function (column) {
			var self = this;
			var selector = column.selector;

			this._selectorColumns.push(column);
			this._selectorSingleRow = this._selectorSingleRow || column.selector === 'radio';

			var renderSelectorInput = typeof selector === 'function' ?
				selector : this._defaultRenderSelectorInput;

			column.sortable = false;

			column.renderCell = function (object, value, cell) {
				var row = object && self.row(object);
				value = row && self.selection[row.id];
				renderSelectorInput(column, !!value, cell, object);
			};

			column.renderHeaderCell = function (th) {
				var label = 'label' in column ? column.label : column.field || '';

				if (column.selector === 'radio' || !self.allowSelectAll) {
					th.appendChild(document.createTextNode(label));
				}
				else {
					column._selectorHeaderCheckbox = renderSelectorInput(column, false, th, {});
					self._hasSelectorHeaderCheckbox = true;
				}
			};
		},

		_handleSelectorClick: function (event) {
			// Avoid double-triggering code below due to space key on input automatically triggering click (#731)
			if (event.target.nodeName === 'INPUT' && event.type === 'keydown' && event.keyCode === 32) {
				return;
			}

			var cell = this.cell(event);
			var row = cell.row;

			// We would really only care about click, since other input sources like spacebar
			// trigger a click, but the click event doesn't provide access to the shift key in firefox, so
			// listen for keydown as well to get an event in firefox that we can properly retrieve
			// the shiftKey property
			if (event.type === 'click' || event.keyCode === 32 ||
				(!has('opera') && event.keyCode === 13) || event.keyCode === 0) {

				this._selectionTriggerEvent = event;

				if (row) {
					if (this.allowSelect(row)) {
						var lastRow = this._lastSelected && this.row(this._lastSelected);

						if (this._selectorSingleRow) {
							if (!lastRow || lastRow.id !== row.id) {
								this.clearSelection();
								this.select(row, null, true);
								this._lastSelected = row.element;
							}
						}
						else {
							if (row) {
								if (event.shiftKey) {
									// Make sure the last input always ends up checked for shift key
									this._changeSelectorInput(true, {rows: [row]});
								}
								else {
									// No shift key, so no range selection
									lastRow = null;
								}
								lastRow = event.shiftKey ? lastRow : null;
								this.select(lastRow || row, row, lastRow ? undefined : null);
								this._lastSelected = row.element;
							}
						}
					}
				}
				else {
					// No row resolved; must be the select-all checkbox.
					this[this.allSelected ? 'clearSelection' : 'selectAll']();
				}

				this._selectionTriggerEvent = null;
			}
		},

		_changeSelectorInput: function (value, event) {
			if (this._selectorColumns.length) {
				this._updateRowSelectors(value, event);
			}
			if (this._hasSelectorHeaderCheckbox) {
				this._updateHeaderCheckboxes();
			}
		},

		_updateRowSelectors: function (value, event) {
			var rows = event.rows;
			var lenRows = rows.length;
			var lenCols = this._selectorColumns.length;

			for (var iRows = 0; iRows < lenRows; iRows++) {
				for (var iCols = 0; iCols < lenCols; iCols++) {
					var column = this._selectorColumns[iCols];
					var element = this.cell(rows[iRows], column.id).element;
					if (!element) {
						// Skip if row has been entirely removed
						continue;
					}
					element = (element.contents || element).input;
					if (element && !element.disabled) {
						// Only change the value if it is not disabled
						element.checked = value;
						element.setAttribute('aria-checked', value);
					}
				}
			}
		},

		_updateHeaderCheckboxes: function () {
			/* jshint eqeqeq: false */
			var lenCols = this._selectorColumns.length;
			for (var iCols = 0; iCols < lenCols; iCols++) {
				var column = this._selectorColumns[iCols];
				var state = 'false';
				var selection;
				var mixed;
				var selectorHeaderCheckbox = column._selectorHeaderCheckbox;
				if (selectorHeaderCheckbox) {
					selection = this.selection;
					mixed = false;
					// See if the header checkbox needs to be indeterminate
					for (var i in selection) {
						// If there is anything in the selection, than it is indeterminate
						// (Intentionally coerce since selection[i] can be undefined)
						if (selection[i] != this.allSelected) {
							mixed = true;
							break;
						}
					}
					selectorHeaderCheckbox.indeterminate = mixed;
					selectorHeaderCheckbox.checked = this.allSelected;
					if (mixed) {
						state = 'mixed';
					}
					else if (this.allSelected) {
						state = 'true';
					}
					selectorHeaderCheckbox.setAttribute('aria-checked', state);
				}
			}
		},

		configStructure: function () {
			this.inherited(arguments);
			var columns = this.columns;
			this._selectorColumns = [];
			this._hasSelectorHeaderCheckbox = this._selectorSingleRow = false;

			for (var k in columns) {
				if (columns[k].selector) {
					this._configureSelectorColumn(columns[k]);
				}
			}
		},

		_handleSelect: function (event) {
			// Ignore the default select handler for events that originate from the selector column
			var column = this.cell(event).column;
			if (!column || !column.selector) {
				this.inherited(arguments);
			}
		}
	});
});

/**
 * @external dgrid/Selector
 * @see https://github.com/SitePen/dgrid/blob/v0.4.0/doc/components/mixins/Selector.md
 */

/**
 * @module
 * @class BatchMode
 * @extends dgrid/Selector
 * When batch mode is enabled, this module uses dgrid/selector to add a
 * selector column automatically to the grid, which when selected,
 * will enable batch mode.
 * This module is automatically mixed into the dgrid instance
 * created in TableBase.factory
 */
define('hui/table/BatchMode',[
    'dojo/_base/declare',
    'dgrid/Selector',
    '../core/utils',
    '../checkbox'
], function(declare, Selector, utils) {
    return declare(Selector, /** @lends BatchMode# */ {
        /**
         * Prevent the grid from deselecting when the grid is refreshed
         * @type {boolean}
         * @default
         */
        deselectOnRefresh: false,

        /**
         * The name of the batch field property
         * @type {string}
         * @default
        */
        batchField: '_batch',

        /** Returns whether the expansion's visibility should be toggled. If the click event
         * came from an input field, button, or anchor, then it is presumably meant to perform some other action,
         * and the expansion should remain in its current state. Similarly, if the click was inside the batch cell
         * then it should also be ignored. This method assumes that activatorSelector is not being used, as in that case
         * any click within the targeted area should toggle visibility.
         * @param {Event} clickEvent
         * @param {string} batchClass
         * @returns {boolean}
         */
        shouldSelect: function(clickEvent) {
            var select = true;
            if (clickEvent && clickEvent.target) {
                if (clickEvent.target.tagName === 'HA-CHECKBOX' || clickEvent.target.tagName === 'HA-RADIO-BUTTON' ||
                    clickEvent.target.tagName === 'INPUT' || clickEvent.target.tagName === 'BUTTON' ||
                    clickEvent.target.tagName === 'A') {
                    select = false;
                }
                if (!select) {
                    var element = clickEvent.target;

                    while (element) {
                        if (element.tagName === 'HA-TABLE') {
                            break;
                        }

                        if (element.classList.contains('field-' + this.batchField)) {
                            select = true;
                            element = null;
                        } else {
                            element = element.parentElement;
                        }
                    }
                }
            }

            return select;
        },

        /**
         * Whether batch mode is currently enabled, varies independently from
         * allowBatchMode, and only has an effect when allowBatchMode is true.
         *
         * @type {boolean}
         * @default
         */
        batchModeEnabled: true,

        startup: function() {
            if (this._started) {
                return;
            }
            this.set('columns', this.table && this.table.originalColumns ?
                utils.clone(this.table.originalColumns, [this]) : this.get('columns'));
            this.inherited(arguments);
        },

        _setSelectionMode: function(value) {
            this._selectionMode = value;
            return this.inherited(arguments, [(this.allowBatchMode && this.batchModeEnabled) ? this._selectionMode : 'none']);
        },

        /**
         * Disable and re-enables the batch mode selector checkbox
         * @param {Boolean} enabled - Flag indicating whether batchmode is enabled or disabled
         * @private
         */
        _setBatchModeEnabled: function(enabled) {
            this.inherited(arguments);
            Array.prototype.forEach.call(this.domNode.querySelectorAll('.field-_batch ha-checkbox'), function(checkbox) {
                checkbox.disabled = !enabled;
            });
            this.batchModeEnabled = enabled;
            this.set('selectionMode', this._selectionMode);
        },

        _setEditable: function(isEditable) {
            this.inherited(arguments);
            this.set('batchModeEnabled', !isEditable);
        },

        /**
         * Setter for the allowBatchMode property, adds or removes the batch column
         * @param {Boolean} enabled - Whether the batch column should be shown or hidden
         */
        _setAllowBatchMode: function(enabled) {
            this.allowSelectAll = true;
            this.allowBatchMode = enabled;
            this.set('selectionMode', this._selectionMode);
            this.set('columns', this.table && this.table.originalColumns ?
                utils.clone(this.table.originalColumns, [this]) : this.__columns);
        },

        _addCustomColumn: function(columnsArray) {
            this.inherited(arguments);
            if (this.batchModeEnabled && this.allowBatchMode) {
                columnsArray.unshift({ selector: true, field: this.batchField });
            }
            this.inherited(arguments, [columnsArray]);
        },

        /**
         * Prevent header rows from being selectable
         * @param {_Row} row - the row to check
         */
        allowSelect: function(row) {
            return row ? (row.element ? !row.element.classList.contains('category-row') : true) : false;
        },

        /**
         * Convert a columns object literal into an array so the widget can predictably
         * add additional, automated columns, such as batch.
         * @param {Array|Object} columns - the column definition provided by the user
         * @returns {Array}
         * @protected
         */
        _convertColumns: function(columns) {
            if (Array.isArray(columns)) {
                return columns.map(function(column) {
                    // allow the id to be computed
                    column.id = null;
                    return column;
                });
            }

            var columnsArray = Object.keys(columns).map(function(key) {
                var definition = columns[key];
                if (typeof definition === 'string') {
                    return { field: key, label: definition };
                }
                definition.field = key;
                definition.id = null;

                return definition;
            });

            return columnsArray;
        },

        /**
         * Set the value of the select ARIA label for batch actions.
         * Then, call refresh() to make sure the change is applied
         * @param {String} value - the value to set as the label
         */
        _setBatchSelectAriaLabel: function(value) {
            this._batchSelectAriaLabel = value;
            this.refresh();
        },

        /**
         * Set the value of the ARIA label for the batch select all checkbox
         * @param {String} value - the value to set as the label
         */
        _setBatchSelectAllAriaLabel: function(value) {
            this._batchSelectAllAriaLabel = value;
            var ariaLabel = this.domNode && this.domNode.querySelector('.dgrid-header .field-_batch .sr-only');
            if (ariaLabel) {
                ariaLabel.textContent = value;
            }
        },

        _setBatchSelectAllHeaderAriaLabel: function(value) {
            this._batchSelectAllHeaderAriaLabel = value;
            var ariaLabel = this.domNode && this.domNode.querySelector('.dgrid-header th.field-_batch');
            if (ariaLabel) {
                ariaLabel.textContent = value;
            }
        },

        /**
         * The function used to generate the input element for checkboxes
         * @param {Object} column - the column definition
         * @param {Boolean} selected - whetther the selector is currently selected
         * @param {HTMLElement} cell - the cell node
         * @param {Object} object - the current row data
         * @returns {HTMLElement} - the input node that will be used as the selector control
         */
        _defaultRenderSelectorInput: function(column, selected, cell, object) {
            var parent = cell.parentNode,
                grid = column.grid,
                input = cell.input || (cell.input = document.createElement('ha-checkbox'));
            // input.setAttribute('type', 'checkbox');
            cell.appendChild(input);
            (parent && parent.contents ? parent : cell).classList.add('dgrid-selector');
            if (column.tabIndex) {
                input.tabIndex = column.tabIndex;
            }
            input.disabled = grid.collection ? !grid.allowSelect(grid.row(object)) : true;
            input.checked = selected;
            input.setAttribute('aria-checked', selected);
            input.ariaLabel = grid._batchSelectAriaLabel;  // this will add aria-label to child input, see checkbox.js
            return input;
        },

        /**
         * configure the selector column for batch mode
         * @param {Object} column - the column definition
         */
        _configureSelectorColumn: function(column) {
            var selector = column.selector,
                renderSelectorInput;
            this._selectorColumns.push(column);
            this._selectorSingleRow = this._selectorSingleRow || column.selector === 'radio';

            renderSelectorInput = typeof selector === 'function' ?
                selector : this._defaultRenderSelectorInput;

            column.sortable = false;
            column.unhidable = true;
            column.renderCell = function(object, value, cell) {
                var row = object && this.row(object);
                value = row && this.selection[row.id];
                renderSelectorInput(column, !!value, cell, object);

                var input = cell.querySelector('input');
                if (input) {
                    input.setAttribute('aria-label', this._batchSelectAriaLabel);
                }
            }.bind(this);

            column.renderHeaderCell = function(th) {
                column.tabIndex = null;
                var checkbox = column._selectorHeaderCheckbox = renderSelectorInput(column, false, th, {});

                // do not identify this node as a dgrid cell so that the th is not focusable
                // but the checkbox inside is
                th.classList.remove('dgrid-cell');
                th.classList.add('batch-header-cell');
                this._hasSelectorHeaderCheckbox = true;

                th.setAttribute('aria-label', this._batchSelectAllHeaderAriaLabel);
                checkbox.removeAttribute('aria-label');
                checkbox.querySelector('input').setAttribute('aria-label', this._batchSelectAllAriaLabel);
            }.bind(this);
        },

        /**
         * callback that is executed when a row selector is clicked.
         * This override prevents the spacebar from duplicating the event
         * @override
         */
        _handleSelectorClick: function(event) {
            if (event.keyCode !== /*SPACE*/32) {
                return this.inherited(arguments);
            }
        },

        _handleSelect: function(event) {
            if (this.shouldSelect(event)) {
                return this.inherited(arguments);
            }
        }
    });
});

/**
 * @module
 * @class PersistentSort
 * Save information on table sorting to localstorage
 *
 * This module is automatically mixed into the dgrid instance
 * created in TableBase.factory
 */
define('hui/table/PersistentSort',[
    'dojo/_base/declare'
], function(declare) {

    return declare(null, {
        postMixInProperties: function() {
            this.inherited(arguments);
            this._loadLastSort();
        },

        /**
         * Save the last sort to localstorage
         * @protected
         */
        _saveLastSort: function() {
            if (this.userId && this.persistentId && window.localStorage && this.sort && this.sort.length) {
                window.localStorage.setItem(this.userId + this.persistentId, JSON.stringify(this.sort));
            }
        },

        /**
         * load the last sort from localstorage
         * @protected
         */
        _loadLastSort: function() {
            var lastSort;
            if (this.userId && this.persistentId && window.localStorage) {
                try {
                    if ((lastSort = JSON.parse(window.localStorage.getItem(this.userId + this.persistentId)))) {
                        this.set('sort', lastSort);
                    }
                } catch (ignore) {
                    //Do nothing
                }
            }

            return Boolean(lastSort);
        },

        /**
         * set the current sort and save it to localstorage
         * @override
         */
        _setSort: function() {
            this.inherited(arguments);
            this._saveLastSort();
        },

        _setUserId: function(userId) {
            this.userId = userId;
            if (!this._loadLastSort()) {
                this._saveLastSort();
            }
        },

        _setPersistentId: function(persistentId) {
            this.persistentId = persistentId;
            if (!this._loadLastSort()) {
                this._saveLastSort();
            }
        }
    });
});

/**
 * @module
 * @class DefaultRenderer
 * This is the default renderer factory class, created to be an extension point
 * for other renderers to be based on
 */
define('hui/table/DefaultRenderer',[
    'object-utils/classes'
], function(classes) {
    return classes.extend(Object, {

        /**
         * Do any setup for this renderer(not for the table)
         * Any properties on this.tableConfig will be set on the table when this
         * renderer is activated, and defaults will be restored when this render mode is
         * removed. Additionally, this.columns, if it is defined, will be set as the column def for the table while this renderer is
         * active.
         *
         * @param {Object} tableConfig
         */
        constructor: function(tableConfig) {
            this.tableConfig = tableConfig || {};
        },

        /**
         * Render a row, given the data object for the row, any options passed to the table's render row method,
         * and the defaultRender function. Note that Table can chain multiple render modes together. In this case the
         * result of the defaultRender will wrap the previous render modes row method, in which case it may call its
         * own defaultRender method, delegating to the previous renderer or the table's renderRow method, or it might
         * create its own dom. The HATable instance can be accessed as this.table
         * @param {Object} object - The item that this row represents
         * @param {Object} options - The options passed to the table's row render method
         * @param {Function} defaultRender - The table's original render method, or the row method of the previous renderer
         *
         * @returns {Element}
         */
        row: function(object, options, defaultRender) {
            return defaultRender();
        },

        /**
         * Render the grid header. Note that generally, the header will have already been rendered when the table
         * was created. If there is an existing header node, it can be accessed as shown in the default implementation.
         * As with renderRow, defaultRender may point to the table's renderHeader method or the previous renderer's
         * header method.
         * @param {Function} defaultRender
         * @returns {Element|*}
         */
        header: function(defaultRender) {
            defaultRender();
            if (this.table) {
                return this.table.querySelector('.ha-table-header');
            }
        },

        /**
         * Use this method to do any setup specific to this render mode that requires access to the table. As in the
         * other methods, the table can be accessed as this.table. Note that any properties of this.tableConfig, and
         * this.columns will automatically be applied to the table, and cleaned up later. For configuration of table
         * properties or columns it is therefore best to use those properties, initializing them in the constructor or
         * at the time of creation of the object. Any setup that can't be captured by those properties should be done here.
         */
        setup: function() {
            // Just an extension point
        },

        /**
         * Cleanup anything that was setup in setup. Note that properties in this.tableConfig, and columns defs changed
         * via this.columns will automatically be restored to their previous values, so only additional configuration
         * or listeners need to be cleaned up here.
         */
        cleanup: function() {
            // Just an extension point
        }
    });
});

/**
 * @module
 * A factory module for creating renderer factories.
 */
define('hui/table/rendererFactoryFactory',[
    '../core/utils',
    'object-utils/classes',
    './DefaultRenderer'
], function(utils, classes, DefaultRenderer) {
    return function(renderers) {
        renderers = renderers || {};
        renderers.default = [new DefaultRenderer()];
        Object.keys(renderers).forEach(function(key) {
            if (renderers[key] && !Array.isArray(renderers[key])) {
                renderers[key] = [renderers[key]];
            }
        });

        var rendererFactory = function(mode, type, table) {
            var currentRenderers,
                config,
                key;
            currentRenderers = renderers[mode] || renderers.default;
            currentRenderers.forEach(function(renderer) {
                renderer.table = table.table;
            });
            if (type === 'columns') {
                if (!renderers.default.columns) {
                    renderers.default.columns = table.table.originalColumns;
                }

                // Return a single column definition. Column definitions might be arrays or objects,
                // and might not merge cleanly, so the last definition wins.
                return utils.clone(currentRenderers.reduce(function(columns, renderer) {
                    return renderer.columns || columns;
                }, renderers.default.columns), [table]);
            } else if (type === 'tableConfig') {
                renderers.default.tableConfig =
                    renderers.default.tableConfig || {};
                config = currentRenderers.reduce(function(prev, next) {
                    if (next.tableConfig) {
                        return utils.mixin(prev || {}, next.tableConfig);
                    } else {
                        return prev;
                    }
                }, null);
                if (config) {
                    for (key in config) {
                        if (!renderers.default.tableConfig.hasOwnProperty(key)) {
                            renderers.default.tableConfig[key] = table.get(key);
                        }
                    }
                    config = utils.mixin({}, renderers.default.tableConfig, config);
                } else {
                    config = renderers.default.tableConfig;
                }

                return config;
            } else if (type === 'header') {
                return function(defaultRenderHeader) {
                    var renderHeader = (currentRenderers.reduce(function(renderHeader, renderer) {
                        if (renderer.header) {
                            return renderer.header.bind(renderer, renderHeader);
                        } else {
                            return renderHeader;
                        }
                    }, defaultRenderHeader));
                    if (renderHeader === defaultRenderHeader) {
                        return renderers.default[0].header(defaultRenderHeader);
                    } else {
                        return renderHeader();
                    }
                };
            } else if (type === 'row') {
                return function(object, options, defaultRender) {
                    var renderRow = (currentRenderers.reduce(function(renderRow, renderer) {
                        if (renderer.row) {
                            return renderer.row.bind(renderer, object, options, renderRow);
                        } else {
                            return renderRow;
                        }
                    }, defaultRender));

                    if (renderRow === defaultRender) {
                        return renderers.default[0].row(object, options, defaultRender);
                    } else {
                        return renderRow();
                    }
                };
            } else {
                return function(table) {
                    var customFunctionCalled = false;
                    currentRenderers.forEach(function(renderer) {
                        if (renderer[type]) {
                            renderer[type](table);
                            customFunctionCalled = true;
                        }
                    });

                    if (!customFunctionCalled && renderers.default[type]) {
                        renderers.default[type](table);
                    }
                };
            }
        };
        rendererFactory.addRenderMode = function(name) {
            var tempDefaults = {
                columns: renderers.default.columns,
                tableConfig: renderers.default.tableConfig
            };
            renderers[name] = Array.prototype.slice.call(arguments, 1);
            if (name === 'default') {
                utils.mixin(renderers.default, tempDefaults);
            }
        };

        rendererFactory.removeRenderMode = function(name) {
            delete renderers[name];
            if (name === 'default') {
                renderers.default = [new DefaultRenderer()];
            }
        };

        rendererFactory.resetConfig = function(table) {
            renderers.default.columns = table.table.originalColumns;
            var key;
            renderers.default.tableConfig = renderers.default.tableConfig || {};
            for (key in renderers.default.tableConfig) {
                renderers.default.tableConfig[key] = table.get(key);
            }
        };
        return rendererFactory;
    };
});

/**
 * @module
 * @class ScopeListStyles
 * @extends dgrid/list
 * Extends List to add styling for scrollbars
 */
define('hui/table/scopeListStyles',[
    'dojo/has',
    'dgrid/Grid',
    'dgrid/List',
    'dgrid/util/misc'
], function(has, Grid, List, miscUtil) {
    var scrollbarWidth,
        scrollbarHeight;
    List.extend({
        resize: function() {
            var bodyNode = this.bodyNode,
                headerNode = this.headerNode,
                footerNode = this.footerNode,
                headerHeight = headerNode.offsetHeight,
                footerHeight = this.showFooter ? footerNode.offsetHeight : 0;

            this.headerScrollNode.style.height = bodyNode.style.marginTop = headerHeight + 'px';
            bodyNode.style.marginBottom = footerHeight + 'px';

            if (!scrollbarWidth) {
                // Measure the browser's scrollbar width using a DIV we'll delete right away
                scrollbarWidth = has('dom-scrollbar-width');
                scrollbarHeight = has('dom-scrollbar-height');

                // Avoid issues with certain widgets inside in IE7, and
                // ColumnSet scroll issues with all supported IE versions
                if (has('ie')) {
                    scrollbarWidth++;
                    scrollbarHeight++;
                }

                // add rules that can be used where scrollbar width/height is needed
                miscUtil.addCssRule('ha-table .dgrid-scrollbar-width', 'width: ' + scrollbarWidth + 'px');
                miscUtil.addCssRule('ha-table-virtual .dgrid-scrollbar-width', 'width: ' + scrollbarWidth + 'px');
                miscUtil.addCssRule('ha-table .dgrid-scrollbar-height', 'height: ' + scrollbarHeight + 'px');
                miscUtil.addCssRule('ha-table-virtual .dgrid-scrollbar-height', 'height: ' + scrollbarHeight + 'px');

                // for modern browsers, we can perform a one-time operation which adds
                // a rule to account for scrollbar width in all grid headers.
                miscUtil.addCssRule('ha-table .dgrid-header-row', 'right: ' + scrollbarWidth + 'px');
                miscUtil.addCssRule('ha-table-virtual .dgrid-header-row', 'right: ' + scrollbarWidth + 'px');
                // add another for RTL grids
                miscUtil.addCssRule('ha-table .dgrid-rtl-swap .dgrid-header-row', 'left: ' + scrollbarWidth + 'px');
                miscUtil.addCssRule('ha-table-virtual .dgrid-rtl-swap .dgrid-header-row', 'left: ' + scrollbarWidth + 'px');
            }
        }
    });
});

/**
 * @module
 * @class TableBase
 * The main dgrid extension, whcih manages constructing the dgrid instance used
 * by ha-table and mixes in all appropriate mixins to the instance. This file is
 * also a catch-all for any miscellaneous functionality and extensions that don't
 * fit into the other dgrid mixins or are too small to exist on their own
 */
define('hui/table/TableBase',[
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/when',
    'dojo/on',
    'dojo/aspect',
    'dgrid/Grid',
    'dgrid/Keyboard',
    './ColumnLocking',
    './ContentGroupPagination',
    './OnDemandContentGroups',
    'dgrid/extensions/ColumnResizer',
    './ColumnHider',
    './RowReordering',
    './RowDeletion',
    './Editor',
    './RowStatusIndicator',
    './RowErrors',
    './BatchMode',
    './PersistentSort',
    './rendererFactoryFactory',
    '../core/deviceUtils',
    './scopeListStyles'
], function(declare, lang, when, on, aspect, Grid, Keyboard, ColumnLocking, Pagination, OnDemandContentGroups,
            ColumnResizer, ColumnHider, RowReordering, RowDeletion, Editor,  RowStatusIndicator, RowErrors,
            BatchMode, PersistentSort, rendererFactoryFactory, deviceUtils) {

    function appendIfNode(parent, subNode) {
        if (subNode && subNode.nodeType) {
            parent.appendChild(subNode);
        }
    }

    function captureStylesAndReposition(table) {
        var parentElement = table.domNode && table.domNode.parentElement && table.domNode.parentElement.parentElement,
            parentBoundingRect = parentElement && parentElement.getBoundingClientRect();
        if (!parentElement || table._oldParentStyles) {
            return;
        }

        if (!parentBoundingRect.width || !parentBoundingRect.height) {
            table._oldParentStyles = {
                position: parentElement.style.position,
                left: parentElement.style.left,
                top: parentElement.style.top,
                display: parentElement.style.display,
                width: parentElement.style.width,
                height: parentElement.style.height
            };

            table._resizedParentElement = parentElement;
            parentElement.style.position = 'absolute';
            parentElement.style.left = '-5000px';
            parentElement.style.top = '-5000px';
            parentElement.style.display = 'inline-block';
            parentElement.style.width = '2000px';
            parentElement.style.height = '20000px';
        }
    }

    function setupSortListeners(grid) {
        grid.on('dgrid-sort', function(event) {
            var sort = event.sort[0],
                field = sort ? sort.property : '',
                descending = sort ? sort.descending : false,
                columns = grid.columns || [],
                comparator;

            for (var i = 0; i < columns.length; ++i) {
                if (columns[i].field === field) {
                    comparator = columns[i].comparator;
                    break;
                }
            }

            if (typeof comparator === 'function') {
                event.preventDefault();
                grid.set('sort', function(a, b) {
                    return (descending ? -1 : 1) * comparator.call(grid, a, b);
                });
                grid.updateSortArrow(event.sort, true);
            }
        });
    }

    Grid.extend({
        /**
         * Override the renderRow method, allowing for the checking of a
         * renderPrintCell method if it exists on the column definition
         * @override
         */
        renderRow: function(object, options) {
            var div,
            row = this.createRowCells('td', function(td, column) {
                var data = object;
                // Support get function or field property (similar to DataGrid)
                if (column.get) {
                    data = column.get(object);
                } else if ('field' in column && column.field !== '_item') {
                    data = data[column.field];
                }

                if (this.print && column.renderPrintCell) {
                    appendIfNode(td, column.renderPrintCell(object, data, td, options));
                } else if (column.renderCell) {
                    // A column can provide a renderCell method to do its own DOM manipulation,
                    // event handling, etc.
                    appendIfNode(td, column.renderCell(object, data, td, options));
                } else {
                    this._defaultRenderCell.call(column, object, data, td, options);
                }
            }.bind(this), options && options.subRows, object);
            // row gets a wrapper div for a couple reasons:
            // 1. So that one can set a fixed height on rows (heights can't be set on <table>'s AFAICT)
            // 2. So that outline style can be set on a row when it is focused,
            // and Safari's outline style is broken on <table>
            div = document.createElement('div');
            div.setAttribute('role', 'row');
            div.appendChild(row);
            return div;
        },

        configStructure: function() {
            // configure the columns and subRows
            var subRows = this.subRows,
                columns = this._columns = this.columns;

            // Reset this.columns unless it was already passed in as an object
            this.columns = !columns ? {} : columns;

            if (subRows) {
                // Process subrows, which will in turn populate the this.columns object
                for (var i = 0; i < subRows.length; i++) {
                    subRows[i] = this._configColumns(i + '-', subRows[i]);
                }
            } else {
                this.subRows = [this._configColumns('', columns)];
            }
        }
    });

    var TableBase = declare(null, {
        rendererFactory: null,

        _firstRun: true,

        _totalRowClickListener: null,
        _totalRow: null,

        postMixInProperties: function() {
            this.inherited(arguments);

            if (this.totals) {
                this.set('totals', this.totals);
            }
        },

        buildRendering: function() {
            this.inherited(arguments);
            this.headerNode.classList.add('ha-table-header');
            this.contentNode.removeAttribute('role');
        },

        /**
         * Sets the totals for the table and then renders a total row
         * @param {object} totals The totals object, which maps column fields to totals
         * @private
         */
        _setTotals: function(totals) {
            this.totals = totals;

            this._renderTotalRow(totals, '_totalRow');
        },

        postCreate: function() {
            this.inherited(arguments);
            // catch and rethrow select/deselect/refresh-complete without the
            // 'dgrid-" prefix
            this.on([
                'dgrid-select',
                'dgrid-deselect',
                'dgrid-refresh-complete',
                'dgrid-error',
                'dgrid-cellfocusin',
                'dgrid-cellfocusout',
                'dgrid-sort',
                'dgrid-columnresize',
                'dgrid-columnreorder',
                'dgrid-columnstatechange',
                'dgrid-datachange',
                'dgrid-editor-show',
                'dgrid-editor-hide'
            ].join(','), function(event) {
                var type = event.type.substr(6);
                if (type === 'deselect' || type === 'select') {
                    // prefix with batch- for selection so the event is not confused
                    // with a select event on a component in the table bar
                    type = 'batch-' + type;
                }
                event.stopPropagation();
                on.emit(this.domNode, type, event);
            }.bind(this));

            var callRenderTotalRow = function() {
                this._renderTotalRow(this.totals, '_totalRow');
            }.bind(this);
            this._listeners.push(
                aspect.after(this, 'renderArray', function(rows) {
                    this.contentNode.removeAttribute('tabIndex');
                    return rows;
                }),
                aspect.after(this, 'renderQuery', function(result) {
                    this._applyA11yRoles();

                    return result;
                }),
                aspect.after(this, '_hideColumn', callRenderTotalRow),
                aspect.after(this, '_showColumn', callRenderTotalRow),
                aspect.after(this, '_processScroll', this._publishResizeEvent.bind(this)),
                aspect.after(this, '_updateNavigation', this._publishResizeEvent.bind(this)),
                aspect.around(this, 'renderHeader', function(renderHeader) {
                    return function() {
                        var self = this,
                            args = arguments;
                        if (this.rendererFactory) {
                            return this.rendererFactory(this.renderMode, 'header', this)(function() {
                                return renderHeader.apply(self, args);
                            });
                        } else {
                            return renderHeader.call(this);
                        }
                    };
                }),
                aspect.around(this, 'renderRow', function(renderRow) {
                    return function(object, options) {
                        var args = arguments, // Array.prototype.slice.call(arguments),
                            self = this;
                        if (this.rendererFactory) {
                            return this.rendererFactory(this.renderMode, 'row', this)(object, options, function() {
                                return renderRow.apply(self, args);
                            });
                        }

                        return renderRow.apply(this, args);
                    };
                })
            );

            setupSortListeners(this);
            this.rendererFactory = this.rendererFactory || rendererFactoryFactory();
        },

        cleanup: function() {
            this._cleanup = true;
            this.inherited(arguments);
            this._cleanup = false;
        },

        _publishResizeEvent: function() {
            on.emit(this.domNode, 'table-resize', {
                cancelable: false,
                bubbles: true
            });
        },

        addRenderMode: function() {
            var args = Array.prototype.slice.call(arguments, 0);

            if (this.rendererFactory) {
                this.rendererFactory.addRenderMode.apply(this.rendererFactory, args);
            } else {
                this.rendererFactory = rendererFactoryFactory();
                this.rendererFactory.addRenderMode.apply(this.rendererFactory, args);
            }
        },

        removeRenderMode: function(name) {
            if (this.rendererFactory) {
                this.rendererFactory.removeRenderMode(name);
            }
        },

        /**
         * Generage the original row and then add a presentation role
         * to each TR node in the row
         * @return {HTMLElement} - the row element
         */
        createRowCells: function() {
            var row = this.inherited(arguments);
            Array.prototype.forEach.call(row.querySelectorAll('tr'), function(tr) {
                tr.setAttribute('role', 'presentation');
            });
            return row;
        },

        _setSort: function() {
            this._sortCalled = true;
            this.inherited(arguments);
            this._setSortA11yAttributes();
        },

        _setSortA11yAttributes: function() {
            if (!this.columns.length || !this.sort.length) {
                return;
            }

            var sortedFields = {};

            if (this.sort.forEach) {
                this.sort.forEach(function(sortOptions) {
                    sortedFields[sortOptions.property] = sortOptions.descending ? 'descending' : 'ascending';
                });
            }

            this.columns.forEach(function(column) {
                if (column.field in sortedFields) {
                    column.headerNode.setAttribute('aria-sort', sortedFields[column.field]);
                } else if (column.headerNode.classList.contains('dgrid-sortable')) {
                    column.headerNode.setAttribute('aria-sort', 'none');
                } else if (column.headerNode.hasAttribute('aria-sort')) {
                    column.headerNode.removeAttribute('aria-sort');
                }
            });
        },

        /**
         * Refresh the grid, but only if it's already been started
         * @override
         */
        refresh: function() {
            if (!this._started) {
                // if the grid hasn't been started... don't do any refreshing
                return;
            }

            captureStylesAndReposition(this);
            return this.inherited(arguments);
        },

        resetParentStyles: function() {
            var key;
            if (this._resizedParentElement) {
                for (key in this._oldParentStyles) {
                    this._resizedParentElement.style[key] = this._oldParentStyles[key];
                }

                this._oldParentStyles = null;
                this._resizedParentElement = null;
            }
        },

        /**
         * Rerender a row without rerendering the entire grid
         * @param {Object} target - the target row to rerender
         * @param {Object} [options] - The options associated with the row
         */
        reRenderRow: function(target, options) {
            options = options || {};
            var row = this.row(target);
            if (row && row.element) {
                options.rows = this._rows;
                var parent = row.element.parentElement,
                    beforeNode = row.element.nextSibling;
                this.removeRow(row.element);
                this.insertRow(row.data, parent, beforeNode, row.element.rowIndex, options);
            }
        },

        /**
         * toggle a compact class on the top level noode
         * @param {Boolean} compact - whether to enable compact mode
         */
        _setCompact: function(compact) {
            this.compact = compact;
            if (this.compact) {
                this.domNode.classList.add('compact');
            } else {
                this.domNode.classList.remove('compact');
            }
        },

        /**
         * toggle the autoheight class on the table, allowing it to grow or shrink
         * depending on the data
         * @param {Boolean} value - the value to set to autoheight
         */
        _setAutoheight: function(value) {
            this.domNode.classList[value ? 'add' : 'remove']('dgrid-autoheight');
        },

        startup: function() {
            // add a _firstRun property to detect initial loading of the grid
            // This allows us to make assumptions about the state of the grid
            // to increase performance.
            this.inherited(arguments);
            this._firstRun = false;
        },

        /**
         * Override the original scrollTo to prevent functionality
         * on the first run, improving startup performance while assuming
         * that the node is already scrolled to the top and left
         * @override
         */
        scrollTo: function() {
            if (!this._firstRun) {
                return this.inherited(arguments);
            }
        },

        /**
         * Set the render mode and refresh the grid
         * @param {String} name - the name of the render mode to switch to
         */
        _setRenderMode: function(name) {
            if (this.rendererFactory && name !== this.renderMode) {
                this.rendererFactory(this.renderMode, 'cleanup', this)(this);

                this.renderMode = name;
                this._pauseRendering();
                this.set('columns', this.rendererFactory(this.renderMode, 'columns', this));
                this.set(this.rendererFactory(this.renderMode, 'tableConfig', this));
                this.rendererFactory(this.renderMode, 'setup', this)(this);
                this._resumeRendering();
                this.refresh();
            }
        },

        /**
         * Temporarily disables any rendering functions, and prevents refreshing. This is helpful for preventing errors
         * that might happen in situations such as refreshing after setting columns from a new render mode but before
         * setup is called and performs the necessary configuration. It also helps reduce unnecessary rendering in
         * those types of situations.
         * @private
         */
        _pauseRendering: function() {
            this._pausedRefresh = this.refresh;
            this.refresh = function() {};
            this._pausedRenderArray = this.renderArray;
            this.renderArray = function() {
                return this._rows;
            };
            this._pausedRenderHeader = this.renderHeader;
            this.renderHeader = function() {};
        },

        /**
         * Resume paused renderers
         * @private
         */
        _resumeRendering: function() {
            if (this._pausedRefresh) {
                this.refresh = this._pausedRefresh;
                this._pausedRefresh = null;
            }

            if (this._pausedRenderArray) {
                this.renderArray = this._pausedRenderArray;
                this._pausedRenderArray = null;
            }

            if (this._pausedRenderHeader) {
                this.renderHeader = this._pausedRenderHeader;
                this._pausedRenderHeader = null;
            }
        },

        _setRendererFactory: function(rendererFactory) {
            this.rendererFactory = rendererFactory;
            // TODO - Add default renderers here until registry is removed
        },

        /**
         * Return a row object containing, adding a flagNode and contentNode property
         * @override
         * @return {_Row} - the row object for the specified row
         */
        row: function() {
            var row = this.inherited(arguments);
            if (row && row.element) {
                row.flagNode = row.element.querySelector('.table-row-flag');
                row.contentNode = row.element.querySelector('.table-row-content');
            }

            return row;
        },

        /**
         * Correct the size of the header scroll node on resize
         * @override
         */
        resize: function() {
            captureStylesAndReposition(this);
            this.inherited(arguments);
            if (this.headerScrollNode) {
                this.headerScrollNode.style.height = '';
            }
            this._publishResizeEvent();
        },

        /**
         * Overrides render header to provide a custom sort function that
         * removes sorting every third click, so that sorting can
         * be disabled by the user, and then calls the current render mode's
         * header formatter if one is provided.
         * @override
         */
        renderHeader: function() {
            this.inherited(arguments);

            var headerRow = this.headerNode.firstChild,
                headerRows = this.subRows.headerRows || this.subRows;

            headerRows.forEach(function(headerRow) {
                headerRow.forEach(function(headerCell) {
                    if (headerCell.headerNode.classList.contains('dgrid-sortable')) {
                        headerCell.headerNode.setAttribute('aria-sort', 'none');
                    }
                });
            });

            // Mobile devices have column sorting in the 'settings' pane, so disable sorting by
            // clicking the column headers
            if (this._sortListener) {
                this._sortListener.remove();
            }
            if (!deviceUtils.isMobile()) {
                this._sortListener = on(headerRow, 'click,keydown', this._onHeaderClick.bind(this));
            }
        },

        _onHeaderClick: function(event) {
            // respond to click, space keypress, or enter keypress
            if (event.type === 'click' || event.keyCode === 32 ||
                event.keyCode === 13) {
                var target = event.target,
                    sort = this.sort[0],
                    newSort = [],
                    eventObj,
                    field;
                do {
                    if (target.sortable) {
                        field = target.field || target.columnId;
                        // If the click is on the same column as the active sort,
                        // reverse sort direction
                        newSort = [];
                        sort = this.sort[0];
                        if (sort && sort.property === field) {
                            newSort.push({
                                property: field,
                                descending: !sort.descending
                            });
                        } else {
                            newSort.push({
                                property: field,
                                descending: false
                            });
                        }

                        // Emit an event with the new sort
                        eventObj = {
                            bubbles: true,
                            cancelable: true,
                            this: this,
                            parentType: event.type,
                            sort: newSort
                        };

                        if (on.emit(event.target, 'dgrid-sort', eventObj)) {
                            // Stash node subject to DOM manipulations,
                            // to be referenced then removed by sort()
                            this._sortNode = target;
                            this.set('sort', newSort);
                        }

                        break;
                    }
                } while ((target = target.parentNode) && target !== this.headerNode);
            }
        },

        /**
         * When removing a row, check to see if the element has a destroy method and call it
         * @param {HTMLElement} rowElement
         */
        removeRow: function(rowElement) {
            var rowHeight = rowElement.offsetHeight,
                result;
            if (rowElement.destroy) {
                rowElement.destroy();
            }

            result = this.inherited(arguments);
            on.emit(this.domNode, 'row-remove', {
                height: rowHeight,
                bubbles: true,
                cancelable: false
            });
            return result;
        },

        insertRow: function() {
            var element = this.inherited(arguments),
                rowHeight = element.offsetHeight;
            on.emit(this.domNode, 'row-insert', {
                height: rowHeight,
                bubbles: true,
                cancelable: false
            });
            element.classList.add('ha-table-row');

            return element;
        },

        /**
         * This is necessary to restructure the DOM so that the sort arrow can appear immediately after the header cell
         * title (rather than the default of right-aligned)
         */
        updateSortArrow: function() {
            if (this._lastSortedArrow) {
                this._lastSortedArrow.parentNode.parentNode.classList.remove('sorted');
            }

            this.inherited(arguments);

            if (this._lastSortedArrow) {
                var parentNode = this._lastSortedArrow.parentNode;

                parentNode.removeChild(this._lastSortedArrow);
                parentNode.parentNode.classList.add('sorted');

                if (parentNode.firstChild.nextSibling) {
                    parentNode.insertBefore(this._lastSortedArrow, parentNode.firstChild.nextSibling);
                } else {
                    parentNode.appendChild(this._lastSortedArrow);
                }
            }
        },

        /**
         * Convert a columns object literal into an array so the widget can predictably
         * add additional, automated columns, such as batch.
         * @param {Array|Object} columns - the column definition provided by the user
         * @returns {Array}
         * @protected
         */
        _convertColumns: function(columns) {
            if (Array.isArray(columns)) {
                return columns.map(function(column) {
                    // allow the id to be computed
                    column.id = null;
                    return column;
                });
            }

            var columnsArray = Object.keys(columns).map(function(key) {
                var definition = columns[key];
                if (typeof definition === 'string') {
                    return { field: key, label: definition };
                }
                definition.field = key;
                definition.id = null;

                return definition;
            });

            return columnsArray;
        },

        /**
         * Set the column definition and update  the renderers
         * @param {Object|Array} columns - the column definition
         */
        _setColumns: function(columns) {
            if (!columns) {
                return;
            }
            this.__columns = columns;
            // convert them to an array
            var columnsArray = this._convertColumns(columns);

            // Extension point for adding additional
            // columns like the DnD handle and batch mode
            // checkbox
            if (this._addCustomColumn) {
                this._addCustomColumn(columnsArray);
            }
            this.inherited(arguments, [columnsArray]);

            // remove the tabIndex
            // see https://github.com/SitePen/dgrid/issues/1181
            this.headerNode.removeAttribute('tabIndex');
        },

        /**
         * Returns columns, using the private property if available,
         * and otherwise delegating to the default getter.
         * @returns {Array | Object} - The column definition for this table
         * @private
         */
        _getColumns: function() {
            return this.__columns || this.inherited(arguments);
        },

        /**
         * Renders a cell for the total row, and then adds any special classes specified on the column to the
         * cell
         * @param {object} totals The mapping from column fields to totals from which the value to display in the cell will
         * be retrieved
         * @param {HTMLElement} cell The cell that content is being added to
         * @param {object | array} column The column that the cell being rendered belongs to
         * @private
         */
        _renderTotalCell: function(totals, cell, column) {
            var value = totals[column.field] || '';
            cell.textContent = value;
            if (column.className) {
                cell.classList.add(column.className);
            }
        },

        /**
         * Checks to see if the field specified by index if a viable field to render the total label in.
         * It will not render in a batch field, and will not render in a field that has a total value specified for
         * it. Returns the new cell to render in, or the currently specified cell if it's still viable, or null
         * if the checked cell has a total value, as the total label should not be rendered after any rows with
         * a total.
         * @param {object} totals The map from column fields to totals
         * @param {HTMLElement} totalRow The totalRow element
         * @param {HTMLElement} totalTextTarget The current cell selected for rendering the totalText, or null if
         * there isn\' one * selected yet
         * @param {number | string} index The column array index or key to check
         * @returns The appropriate cell to render in, or null if there isn't an appropriate cell
         * @private
         */
        _checkForValidTotalTextCell: function(totals, totalRow, totalTextTarget, index) {
            var fieldName = this.columns[index].field;
            if (fieldName === this.batchField || fieldName === this.categoryProperty) {
                return totalTextTarget;
            }

            if (!totals[fieldName]) {
                return totalTextTarget ? totalTextTarget :
                    totalRow.getElementsByClassName('field-' + this.columns[index].field)[0];

            } else {
                return null;
            }
        },

        /**
         * Renders a total row, and cleans up any old total rows or listeners
         * @param {object} totals The map of column fields to totals
         * @param {string} totalRowProperty The key at which the total row will be stored, can be passed as a parameter
         * so that * this method can be used for table totals and category(content group) totals
         * @param {HTMLElement} beforeNode Optional parameter specifying the node before which the total row will be
         * inserted
         * @returns - the newly rendered total row or nothing if one wasn't rendered
         * @private
         */
        _renderTotalRow: function(totals, totalRowProperty, beforeNode) {
            if (this[totalRowProperty]) {
                if (this[totalRowProperty].parentNode) {
                    this[totalRowProperty].parentNode.removeChild(this[totalRowProperty]);
                }
                this[totalRowProperty] = null;
            }
            if (totals) {
                var totalTextTarget,
                    i,
                    container = beforeNode ? beforeNode.parentNode : this.contentNode,
                    totalRowTable,
                    totalRow,
                    columnKeys,
                    newTotalTextHeader,
                    firstCell,
                    fieldName,
                    isATotalShowing = false,
                    isHidden,
                    columnKey,
                    hiddenSpan;
                totalRowTable = this.createRowCells('td', lang.hitch(this, '_renderTotalCell', totals));
                totalRow = document.createElement('div');
                totalRow.setAttribute('role', 'row');
                // totalRow.classList.add('dgrid-row');
                totalRow.classList.add('total-row');
                totalRow.appendChild(totalRowTable);
                this[totalRowProperty] = totalRow;

                if (Array.isArray(this.columns)) {
                    columnKeys = new Array(this.columns.length);
                } else {
                    columnKeys = Object.keys(this.columns).sort();
                }

                // We want to add the label to the first cell that is not preceded by any
                // more totals. So we start from the last cell, and working backwards, the first
                // empty cell will become the target for the text, but if we find another cell
                // with text preceding the current target we remove it as a candidate and
                // keep searching.
                for (i = columnKeys.length -1; i >= 0; i--) {
                    columnKey = (columnKeys[i] !== undefined && columnKeys[i] !== null) ? columnKeys[i] : i;
                    if (this.columns.hasOwnProperty(columnKey)) {
                        isHidden = this.isColumnHidden && this.isColumnHidden(this.columns[columnKey].id);

                        fieldName = this.columns[columnKey].field;
                        if (totals[fieldName] && !isHidden) {
                            isATotalShowing = true;
                        }
                        totalTextTarget = isHidden ? totalTextTarget : this._checkForValidTotalTextCell(
                            totals,
                            totalRow,
                            totalTextTarget,
                            columnKey
                        );
                        if (!totalTextTarget && fieldName !== this.categoryProperty &&
                            fieldName !== this.batchField && !isHidden) {
                            firstCell = totalRow.getElementsByClassName('field-' + fieldName)[0];
                        }
                    }
                }

                // Only render the total row if one or more cells with totals are visible
                if (isATotalShowing) {
                    if (totalTextTarget) {
                        newTotalTextHeader = document.createElement('th');
                        newTotalTextHeader.innerHTML = totalTextTarget.innerHTML;
                        newTotalTextHeader.setAttribute('scope', 'row');
                        newTotalTextHeader.setAttribute('role', 'rowheader');
                        newTotalTextHeader.textContent = this.totalText || 'TOTAL';
                        newTotalTextHeader.classList.add('total-text');
                        newTotalTextHeader.classList.add('right');
                        newTotalTextHeader.classList.add('dgrid-cell');
                        newTotalTextHeader.classList.add('ha-table-cell');
                        totalTextTarget.parentNode.replaceChild(newTotalTextHeader, totalTextTarget);
                    } else if (firstCell) {
                        hiddenSpan = document.createElement('span');
                        hiddenSpan.classList.add('sr-only');
                        hiddenSpan.textContent = this.totalText;
                        firstCell.insertBefore(hiddenSpan, firstCell.firstChild);
                    }

                    if (container && container.parentNode) {
                        container.insertBefore(totalRow, beforeNode || null);
                    }

                    return totalRow;
                }

                return null;
            }
        },

        /**
         * Sets a new label for total rows and rerenders the total row
         * @param {string} totalText The new label to display in total rows
         * @private
         */
        _setTotalText: function(totalText) {
            this.totalText = totalText;
            if (this._totalRow) {
                this._renderTotalRow(this.totals, '_totalRow');
            }
            this.inherited(arguments);
        },

        /**
         * Sets appropriate 'role' attribute values for accessibility on loading and no-data nodes.
         * @private
         */
        _applyA11yRoles: function() {
            var loadingNodes = this.contentNode.querySelectorAll('.dgrid-loading'),
                noDataNode = this.contentNode.querySelector('.dgrid-no-data');

            Array.prototype.slice.apply(loadingNodes).forEach(function(node) {
                node.setAttribute('role', 'alert');
            });

            if (noDataNode) {
                noDataNode.setAttribute('role', 'gridcell');
            }
        },

        resizeColumnWidth: function(columnId, width) {
            var columns = this.get('columns');

            if (typeof columnId === 'string' && columns[columnId] === undefined) {
                for (var i = 0; i < columns.length; i++) {
                    if (columns[i].field === columnId) {
                        columnId = i;
                        break;
                    }
                }
            }

            this.inherited(arguments, [columnId, width]);
        }
    });

    /**
     * A factory function for generating a new dgrid instance with the appropriate mixins
     * @static
     */
    TableBase.factory = function(config, node) {
        config = config || {};
        // TODO: DnD prevents cell editors from working; might be fixed by restricting DnD source to a single cell
        var base = [Keyboard, ColumnResizer, ColumnHider, Editor, TableBase,
            RowStatusIndicator, RowErrors, BatchMode, RowReordering, RowDeletion, PersistentSort, ColumnLocking];
        if (config.virtual) {
            base.unshift(OnDemandContentGroups);
        } else {
            base.unshift(Grid, Pagination);
        }

        return new (declare(base))(config, node);
    };

    return TableBase;
});

/**
 * @module
 * @class RowEditingRenderer
 * The default renderer for editable grids
 */
define('hui/table/RowEditingRenderer',[
    './DefaultRenderer',
    'object-utils/classes',
    'dojo/aspect',
    '../core/a11y'
], function(DefaultRenderer, classes, aspect) {
    function _getFieldValues(fields) {
        // get all the dirty fields
        var saveFields = {};

        if (fields) {
            Object.keys(fields).forEach(function(fieldName) {
                if (fields[fieldName].getValue) {
                    saveFields[fieldName] = fields[fieldName].getValue();
                }
            });
        }

        return saveFields;
    }

    function _setFieldValues(fields, fieldValues) {
        Object.keys(fieldValues).forEach(function(fieldName) {
            var field = fields[fieldName];

            if (field && field.setValue) {
                field.setValue(fieldValues[fieldName]);
            }
        });
    }

    function _checkFocus(event, originalNode, row, table) {
        if (_checkFocus.timeout) {
            clearTimeout(_checkFocus.timeout);
            _checkFocus.timeout = null;
        }
        _checkFocus.timeout = setTimeout(function() {
            var node = document.activeElement, isOnRow = false;

            while (node && node !== document) {
                if (node === row) {
                    isOnRow = true;
                    break;
                }

                node = node.target ? node.target : node.parentElement;
            }

            if (!isOnRow && row.parentElement) {
                table.rowEditSaveHandler();
            }
        }, 250);
    }

    function _buildEditableRow(defaultRenderer, fieldEditors, object, table) {
        var row = defaultRenderer(),
            tableCells = Array.prototype.slice.call(row.querySelectorAll('td'));

        row.setAttribute('role', 'form');

        tableCells.forEach(function(tableCell) {
            var cell = table.cell(tableCell),
                column = cell.column,
                field = fieldEditors[column.field];

            if (field && field.editor) {
                field.editor.classList.add('row-editor');

                if (field.column.label) {
                    field.editor.placeholder = field.column.label;
                }

                tableCell.innerHTML = '';
                tableCell.appendChild(field.editor);
            }

            Array.prototype.slice.call(tableCell.children).forEach(function(node) {
                node.addEventListener('blur', function(evt) {
                    _checkFocus(evt, node, row, table);
                });
            });
        });

        return row;
    }

    return classes.extend(DefaultRenderer, {
        constructor: function() {
            this._editableRowId = null;
            this._blurEventHandle = null;
            this._removeRowAspect = null;
            this._insertRowAspect = null;
        },
        setup: function(table) {
            var self = this;

            this._removeRowAspect = aspect.before(table, 'removeRow', function(row) {
                var tableRow = table.row(row);

                if (tableRow.id === self._editableRowId) {
                    self._savedFieldValues = _getFieldValues(self._editableFields);
                } else {
                    self._savedFieldValues = null;
                }

                return arguments;
            });

            this._insertRowAspect = aspect.after(table, 'insertRow', function(row) {
                var tableRow = table.row(row);

                if (self._savedFieldValues !== null && self._editableRowId === tableRow.id) {

                    _setFieldValues(self._editableFields, self._savedFieldValues);
                }

                return row;
            });
        },
        cleanup: function() {
            this._cleanEventListeners();
            this._editableRowId = null;
            this._editableFields = null;

            this._removeRowAspect.remove();
            this._removeRowAspect = null;

            this._insertRowAspect.remove();
            this._insertRowAspect = null;
        },
        _cleanEventListeners: function() {
            if (this._blurEventHandle !== null) {
                document.body.removeEventListener('mouseup', this._blurEventHandle);
                this._blurEventHandle = null;
            }
        },
        setEditableRow: function(table, rowId, editableFields) {
            var oldId = this._editableRowId;

            this._editableRowId = rowId;
            this._editableFields = editableFields;

            this._savedFieldValues = null;

            if (oldId !== null) {
                this._cleanEventListeners();

                table.reRenderRow(oldId);
            }

            if (rowId !== null) {
                table.reRenderRow(rowId);
            }
        },
        row: function(object, options, defaultRenderer) {
            var table = this.table,
                row = table.row(object),
                newRow;

            if (row.id !== this._editableRowId) {
                return defaultRenderer();
            }

            newRow = _buildEditableRow(defaultRenderer, this._editableFields, object, table);
            newRow.classList.add('editable-row');

            if (this._blurEventHandle === null) {
                this._blurEventHandle = function(event) {
                    var node = event.target, isInRow = false;

                    while (node && node !== document) {
                        // we check for popovers because they are appended to the body, but they are owned by other nodes
                        if (node.classList.contains('editable-row')) {
                            isInRow = true;
                            break;
                        }

                        node = node.target ? node.target : node.parentElement;
                    }

                    if (!isInRow) {
                        this.table.rowEditSaveHandler();
                    }
                }.bind(this);
                document.body.addEventListener('mouseup', this._blurEventHandle);
            }

            return newRow;
        }
    });
});

/**
 * @module
 * @class RowExtensionRenderer
 * A default renderer for displaying expandable content associated with a row
 */
define('hui/table/RowExpansionRenderer',[
    './DefaultRenderer',
    'object-utils/classes',
    '../core/keys',
    '../core/a11y',
    '../core/utils'
], function(DefaultRenderer, classes, keys, a11y, utils) {
    /**
     * Counter for generating unique IDs for row expansions
     * @type {number}
     * @private
     */
    var counter = 0;

    /**
     * Returns whether the expansion's visibility should be toggled. If the click event
     * came from an input field, button, or anchor, then it is presumably meant to perform some other action,
     * and the expansion should remain in its current state. Similarly, if the click was inside the batch cell
     * then it should also be ignored. This method assumes that activatorSelector is not being used, as in that case
     * any click within the targeted area should toggle visibility.
     * @param {Event} clickEvent
     * @param {string} batchClass
     * @returns {boolean}
     */
    function shouldToggle(clickEvent, batchClass) {
        var toggle = true;
        if (clickEvent && clickEvent.target) {
            var element = clickEvent.target;

            while (element) {
                if (element.tagName === 'HA-TABLE') {
                    break;
                }
                if (element.classList.contains(batchClass)) {
                    toggle = false;
                    element = null;
                } else {
                    element = element.parentElement;
                }
            }
            if (clickEvent.target.tagName === 'HA-CHECKBOX' || clickEvent.target.tagName === 'HA-RADIO-BUTTON' ||
                clickEvent.target.tagName === 'INPUT' || clickEvent.target.tagName === 'BUTTON' ||
                clickEvent.target.tagName === 'A') {
                toggle = false;
            }
        }

        return toggle;
    }

    function _addTableAnimation(table, isEnabled) {
        if (isEnabled) {
            table.querySelector('.dgrid-grid').classList.add('animate-height');
        } else {
            table.querySelector('.dgrid-grid').classList.remove('animate-height');
        }
    }

    return classes.extend(DefaultRenderer, {
        constructor: function(options) {
            options = options || {};
            /**
             * Renders the content of the expanded area. This content is placed below the 'header' in the expanded
             * area, which really is just a div to hold the close button.
             * @type {Function}
             */
            this.renderRowExpansionContent = options.renderRowExpansionContent || function(object) {
                var rowExpansionContentDiv = this.table.ownerDocument.createElement('div'),
                    id = this.table.store.getIdentity(object);
                rowExpansionContentDiv.textContent = 'RowExpansion content for row with object id: ' + id;
                return rowExpansionContentDiv;
            };
            /**
             * Options CSS selector that specifies the element within each row that should trigger the expansion to
             * be displayed/hidden. If not specified, clicking any of the cells will display the expansion
             *
             * @type {string}
             */
            this.activatorSelector = options.activatorSelector;

            /**
             * Optional value to set the height of the row expansion.
             * Should be a numeric value indicating the height in pixels.
             *
             * @type {number}
             */
            this.expansionHeight = options.expansionHeight;

            this.manualActivation = options.manualActivation || false;

            this.expansionClassName = options.expansionClassName;

            this.useFocusIndicator = options.useFocusIndicator || false;

            this.focusIndicatorLabel = options.focusIndicatorLabel || '';

            this._expandedRows = {};

            /**
             * Optional value to specify whether the last expanded row should be scrolled to the top
             * of the table. Defaults to false, which means never scroll.
             * @type {number}
             */
            this.scrollingThreshold = options.scrollingThreshold || false;

            /**
             * Optional value specifying whether expanded rows force the table to resize. Defaults to false.
             * @type {boolean}
             */
            this.autoResizeTable = options.autoResizeTable || false;

            // If the whole row should trigger expansion, than only the batch cell should trigger selection
            if (!options.activatorSelector) {
                this.tableConfig = {
                    selectionMode: 'none'
                };
            }
        },

        /**
         * By default we don't want to let clicks leak out of the expansion content. It can handle its own events and
         * other listeners on the table might not anticipate a click coming from this content. This could be explicitly
         * overridden if for some reason the table needs to handle these click events.
         */
        _expansionMouseHandler: function(event) {
            // Avoid complications with batch mode or other table mouse event listeners by preventing events in the
            // expansion from bubbling out.
            event.stopPropagation();
        },

        /**
         * Toggles the visiblity of the passed element, unless hide is passed to force
         * the element to be shown or hidden
         * @param {HTMLElement} row
         * @param {boolean} hide
         * @param {HTMLElement} activatorElement The element that toggles display of the expanded content
         */
        _toggleRowExpansion: function(row, hide, activatorElement) {
            var rowExpansion = row.querySelector('.ha-table-row-expansion'),
                tableRow = this.table.row(row),
                shouldShow,
                midAnimation;
            if (row.querySelector('.' + this.batchClass)) {
                rowExpansion.classList.add('batch-table-expansion');
                rowExpansion.classList.remove('no-batch-table-expansion');
            } else {
                rowExpansion.classList.add('no-batch-table-expansion');
                rowExpansion.classList.remove('batch-table-expansion');
            }
            if (typeof hide !== 'undefined' && hide !== null) {
                shouldShow = !Boolean(hide);
            } else {
                midAnimation = rowExpansion.classList.contains('hidden') !== rowExpansion.classList.contains('hide-expansion');
                shouldShow =  rowExpansion.classList.contains('hidden');
            }

            if (midAnimation) {
                return;
            }

            if (shouldShow) {
                this._expandedRows[tableRow.id] = true;

                rowExpansion.classList.remove('hidden');
                if (this.useFocusIndicator) {
                    row.classList.add('show-focus');
                }
                setTimeout(function() {
                    rowExpansion.classList.remove('hide-expansion');
                    this._handleFocusAndAriaAttributes(rowExpansion, activatorElement, row);
                }.bind(this), 0);

                if (this.scrollingThreshold !== false) {
                    var scroller = row;

                    while (scroller && !scroller.classList.contains('dgrid-scroller')) {
                        scroller = scroller.parentElement;
                    }

                    if (scroller) {
                        setTimeout(function() {
                            var viewport = scroller.getBoundingClientRect(),
                                rowViewport = row.getBoundingClientRect();

                            if ((viewport.bottom - rowViewport.top) / rowViewport.height < this.scrollingThreshold) {
                                utils.animateScrollTo(scroller, row.offsetTop, 150);
                            }
                        }.bind(this), 50);
                    }
                }

                if (this.autoResizeTable) {
                    setTimeout(function() {
                        this.table._calculateInitialHeight({type: 'row-expander-resize'});
                    }.bind(this), 0);
                }
            } else {
                delete this._expandedRows[tableRow.id];

                rowExpansion.classList.add('hide-expansion');

                if (this.useFocusIndicator) {
                    row.classList.remove('show-focus');
                }

                setTimeout(function() {
                    rowExpansion.classList.add('hidden');
                }.bind(this), 350);

                if (this.autoResizeTable) {
                    setTimeout(function() {
                        _addTableAnimation(this.table, true);

                        this.table._calculateInitialHeight({type: 'row-expander-resize'});
                        setTimeout(function() {
                            _addTableAnimation(this.table, false);
                        }.bind(this), 250);
                    }.bind(this), 250);
                }

                this._handleFocusAndAriaAttributes(rowExpansion, activatorElement, row);
            }
        },

        /**
         * Focus the expanded area or activating element, publish close or show event, and set the value
         * of the aria-expanded attribute as appropriate.
         * @param {HTMLElement} rowExpansion The content that has been expanded or collapsed
         * @param {HTMLElement} activatorElement The element that toggles the display of the expansion content
         * @param {*} row The owning row
         * @private
         */
        _handleFocusAndAriaAttributes: function(rowExpansion, activatorElement, row) {
            if (rowExpansion.classList.contains('hide-expansion')) {
                if (!activatorElement.hasAttribute('tabindex')) {
                    activatorElement.setAttribute('tabindex', '-1');
                    activatorElement.addEventListener('blur', function removeTabIndex() {
                        activatorElement.removeAttribute('tabindex');
                        activatorElement.removeEventListener('blur', removeTabIndex);
                    });
                }

                activatorElement.focus();
                activatorElement.setAttribute('aria-expanded', false);
                row.classList.remove('highlighted-dgrid-row');
                this.table.emit('expandable-row-close', {
                    bubbles: false,
                    row: row
                });
            } else {
                activatorElement.setAttribute('aria-expanded', true);
                row.classList.add('highlighted-dgrid-row');
                rowExpansion.focus();
                this.table.emit('expandable-row-show', {
                    bubbles: false,
                    row: row
                });
            }
        },

        /**
         * Renders the row expansion, and adds event listeners to handle showing/hiding it
         * @param {HTMLElement} row The grid row element
         * @param {Object} object The object being rendered for this cell.
         * @returns {*} The row element the expansion was added to
         */
        renderRowExpansion: function(row, object) {
            var table = this.table,
                rowExpansion = table.ownerDocument.createElement('div'),
                activatorElement = row.querySelector('table') || row,
                toggleRowExpansion = function(event, hide) {
                    if (this.activatorSelector || shouldToggle(event, this.batchClass)) {
                        this._toggleRowExpansion(row, hide, activatorElement);
                    }
                }.bind(this),
                forceToggleRowExpansion = function(event, hide) {
                    this._toggleRowExpansion(row, hide, activatorElement);
                }.bind(this),
                rowExpansionContent = this.renderRowExpansionContent(object, forceToggleRowExpansion),
                closeButton = table.ownerDocument.createElement('button'),
                cleanupListeners,
                keyboardEventHandler = function(event) {
                    if (event.keyCode === keys.ENTER || event.keyCode === keys.SPACEBAR) {
                        toggleRowExpansion(event);
                    }
                },
                expansionId,
                batchCell = row.querySelector('.' + this.batchClass);

            if (this.expansionHeight) {
                rowExpansion.style.height = this.expansionHeight + 'px';
            }
            closeButton.className = 'hi hi-close close-expansion-button';
            closeButton.addEventListener('click', forceToggleRowExpansion);
            closeButton.setAttribute('aria-label', 'Close expanded row');

            rowExpansion.appendChild(rowExpansionContent);

            if (!this.manualActivation) {
                rowExpansionContent.appendChild(closeButton);

                rowExpansion.setAttribute('tabindex', '-1');
                rowExpansion.addEventListener('keydown', function(event) {
                    if (event.keyCode === keys.ESCAPE) {
                        toggleRowExpansion();
                    }

                    a11y.keepFocusInsideListener(event, rowExpansion);
                });
                // Prevent mouse/touch events from bubbling
                rowExpansion.addEventListener('click', this._expansionMouseHandler);
                rowExpansion.addEventListener('mousedown', this._expansionMouseHandler);
                rowExpansion.addEventListener('touchstart', this._expansionMouseHandler);

                if (this.activatorSelector) {
                    // In this case a custom selector has been provided and only that element should activate
                    // the rowExpansion
                    activatorElement = row.querySelector(this.activatorSelector);
                }
                expansionId = rowExpansion.id = 'table-row-expansion' + counter++;
                activatorElement.setAttribute('aria-controls', expansionId);
                activatorElement.setAttribute('aria-expanded', false);

                if (activatorElement && activatorElement.addEventListener) {
                    activatorElement.addEventListener('click', toggleRowExpansion);
                    if (activatorElement.tagName !== 'BUTTON') {
                        activatorElement.addEventListener('keydown', keyboardEventHandler);
                    }
                }
                cleanupListeners = function() {
                    activatorElement.removeEventListener('click', toggleRowExpansion);
                    activatorElement.removeEventListener('keydown', keyboardEventHandler);
                };
            }

            rowExpansion.className = 'ha-table-row-expansion';

            if (!(object.id in this._expandedRows)) {
                rowExpansion.classList.add('hide-expansion');
                rowExpansion.classList.add('hidden');
            }

            if (this.expansionClassName) {
                rowExpansion.classList.add(this.expansionClassName);
            }

            if (batchCell) {
                rowExpansion.classList.add('batch-table-expansion');
            } else {
                rowExpansion.classList.add('no-batch-table-expansion');
            }

            if (this.useFocusIndicator) {
                var focusIndicator = document.createElement('button');
                focusIndicator.className = 'focus-indicator hi hi-chevron-down';
                if (this.focusIndicatorLabel) {
                    focusIndicator.setAttribute('aria-label', this.focusIndicatorLabel);
                }
                focusIndicator.addEventListener('click', function() {
                    this._toggleRowExpansion(row, true, activatorElement);
                }.bind(this));
                row.appendChild(focusIndicator);
            }

            row.appendChild(rowExpansion);
            //Provide cleanup for anything created in the row formatter.
            row.destroy = function() {
                if (cleanupListeners) {
                    cleanupListeners();
                }

                if (rowExpansionContent.destroy) {
                    rowExpansionContent.destroy();
                }
            };
            return row;
        },

        row: function(object, options, defaultRender) {
            var defaultRow = defaultRender();

            return this.renderRowExpansion(defaultRow, object, options);
        },

        setup: function() {
            this.batchClass = 'field-' + this.table.batchField;
        }
    });
});

define('hui/table/responsive/StackedRenderer',[
    'object-utils/classes',
    '../DefaultRenderer'
], function(classes, DefaultRenderer) {
    function generateColumnId(table, columnId) {
        return 'ha-table-' + table.componentId + '-header-' + columnId;
    }

    return classes.extend(DefaultRenderer, {

        constructor: function(tableConfig) {
            this.tableConfig = tableConfig;
        },

        row: function(object, options, defaultRender) {
            var row = defaultRender();

            if (!row.classList.contains('category-row')) {
                var stackedCell = document.createElement('td'),
                    stackedCellContent = document.createElement('div'),
                    leftColumn = document.createElement('div'),
                    rightColumn = document.createElement('div'),
                    table = this.table,
                    tableColumn;

                leftColumn.classList.add('ha-stacked-left-column');
                rightColumn.classList.add('ha-stacked-right-column');
                stackedCell.classList.add('dgrid-cell');
                Object.keys(this._matrix).forEach(function(column) {
                    var div,
                        rows = this._matrix[column],
                        fieldName,
                        i,
                        fieldSelector,
                        field;
                    for (i = 0; i < rows.length; i++) {
                        fieldName = rows[i];
                        div = document.createElement('div');

                        if (fieldName) {
                            fieldSelector = '.field-' + fieldName;
                            field = row.querySelector(fieldSelector);
                            tableColumn = table.table.column(field);
                            div.innerHTML = field.innerHTML;
                            div.setAttribute('aria-describedby', generateColumnId(table, tableColumn.id));
                            div.setAttribute('role', 'gridcell');
                            field.parentElement.removeChild(field);
                        }

                        if (column === 'left') {
                            leftColumn.appendChild(div);
                        } else {
                            rightColumn.appendChild(div);
                        }
                    }
                }, this);

                this._ignore.forEach(function(field) {
                    var cell = row.querySelector('.field-' + field);
                    if (cell) {
                        cell.parentElement.removeChild(cell);
                    }
                });

                stackedCellContent.appendChild(leftColumn);
                stackedCellContent.appendChild(rightColumn);
                stackedCell.appendChild(stackedCellContent);
                row.querySelector('tr').appendChild(stackedCell);
            }

            return row;
        },

        header: function(defaultRender) {
            defaultRender();

            var header = this.table.querySelector('.ha-table-header'),
                batchCell = this.table.querySelector('.batch-header-cell');

            if (header) {
                Array.prototype.slice.call(header.querySelectorAll('th.dgrid-cell'), 0).forEach(function(headerCell) {
                    if (headerCell.columnId) {
                        headerCell.id = generateColumnId(this.table, headerCell.columnId);
                    }
                }.bind(this));
            }

            if (batchCell) {
                var batchBox = batchCell.querySelector('ha-checkbox'),
                    tableBar = this.table._toolbarNode,
                    batchContainer = tableBar.querySelector('.mobile-batch-header');

                if (!batchContainer) {
                    batchContainer = this.table.ownerDocument.createElement('div');
                    batchContainer.classList.add('mobile-batch-header');
                    batchContainer.classList.add('dgrid-selector');

                    /**
                     * Since we've taken the batch checkbox out of the header, we need to manually
                     * call the selection mode click handler.  We need to set these custom properties
                     * to trick the selection module into thinking this click belongs to the table header.
                     */
                    batchContainer.addEventListener('click', function(event) {
                        event.column = {
                            row: null
                        };
                        event.element = batchContainer;
                        this.table.table._handleSelectorClick(event);
                    }.bind(this));

                    tableBar.classList.add('mobile-batch-container');
                    tableBar.appendChild(batchContainer);
                }

                batchContainer.innerHTML = '';
                batchContainer.appendChild(batchBox);
            }
        },

        setup: function() {
            var columns = this.table.columns,
                matrix = {
                    'left': [],
                    'right': []
                },
                ignoredColumns = [],
                field,
                addToLeft = true;
            function checkColumnPositions(column) {
                if (column.stackedColumn === 'left' || column.stackedColumn === 'right') {
                    if (typeof column.stackedRow === 'number') {
                        matrix[column.stackedColumn][column.stackedRow] = column.field;
                    }
                } else if (column.field) {
                    ignoredColumns.push(column.field);
                } else if (typeof column === 'string') {
                    ignoredColumns.push(column);
                }
            }
            if (Array.isArray(columns)) {
                columns.forEach(checkColumnPositions);
            } else {
                Object.keys(columns).map(function(key) {
                    return typeof columns[key] === 'string' ? key : columns[key];
                }).forEach(checkColumnPositions);
            }
            if (matrix.left.length === 0 && matrix.right.length === 0) {
                while (matrix.right.length < 3 && (field = ignoredColumns.shift())) {
                    matrix[addToLeft ? 'left' : 'right'].push(field);
                    addToLeft = !addToLeft;
                }
            }
            this._matrix = matrix;
            this._ignore = ignoredColumns;

            this.table.classList.add('ha-stacked-table');
        },

        cleanup: function() {
            this.table.classList.remove('ha-stacked-table');
        }
    });
});


define('hui/table/responsive/ColumnLockingRenderer',[
    'object-utils/classes',
    '../DefaultRenderer'
], function(classes, DefaultRenderer) {
    return classes.extend(DefaultRenderer, {
        constructor: function _() {
            _.super(this);
            this.tableConfig.lockedColumns = 1;
        },

        setup: function() {
            this.table.classList.add('ha-column-locking-table');
            this.table.refresh();
        },

        cleanup: function() {
            this.table.classList.remove('ha-column-locking-table');
        }
    });
});


define('hui/table/responsive/ResponsiveDefaultRenderer',[
    'object-utils/classes',
    '../DefaultRenderer'
], function(classes, DefaultRenderer) {
    return classes.extend(DefaultRenderer, {
        setup: function() {
            this.table.classList.add('ha-table-simple-scroll');
        },

        cleanup: function() {
            this.table.classList.remove('ha-table-simple-scroll');
        }
    });
});



define('text!hui/table/table.html',[],function () { return '<template>\n    <div class="tablebar">\n        <div class="table-bar tablebar-default" role="menubar">\n            <div class="custom-node"></div>\n            <div class="filter-node"></div>\n            <div class="default-actions">\n                <span class="custom-action-node"></span>\n                <button name="edit">\n                    <span class="hi hi-edit" role="presentation" aria-hidden="true"></span>\n                    <span class="sr-only">{{editIconText}}</span>\n                </button>\n                <button name="print">\n                    <span class="hi hi-print" role="presentation" aria-hidden="true"></span>\n                    <span class="sr-only">{{printIconText}}</span>\n                </button>\n                <button aria-haspopup="true" name="export">\n                    <span class="hi hi-export" role="presentation" aria-hidden="true"></span>\n                    <span class="sr-only">{{exportIconText}}</span>\n                </button>\n                <button name="settings">\n                    <span class="hi hi-settings-o" role="presentation" aria-hidden="true"></span>\n                    <span class="sr-only">{{settingsIconText}}</span>\n                </button>\n                <ha-popover class="ha-table-settings-popover">\n                    <ha-popover-form>\n                        <section>\n                            <div class="section column-hider hidden">\n                                <h4>{{editColumnsText}}</h4>\n\n                                <div class="edit-columns"></div>\n                            </div>\n\n\n                            <div class="section">\n                                <div class="display-density hidden">\n                                    <h4>{{displayDensityText}}</h4>\n                                </div>\n\n                                <div class="custom"></div>\n\n                                <div class="rows-per-page">\n                                    <h4>{{rowsPerPageText}}</h4>\n\n                                    <ha-radio-button-group name="rowsPerPage">\n                                        <ha-radio-button label="50" value="50"></ha-radio-button>\n                                        <ha-radio-button label="150" value="150"></ha-radio-button>\n                                        <ha-radio-button label="300" value="300"></ha-radio-button>\n                                    </ha-radio-button-group>\n                                </div>\n                            </div>\n                        </section>\n                    </ha-popover-form>\n                </ha-popover>\n            </div>\n        </div>\n        <div class="table-bar tablebar-batch animate-hidden" role="menubar">\n            <div class="batch-node"></div>\n            <div class="batch-count" role="alert"></div>\n        </div>\n        <div class="table-bar tablebar-edit animate-hidden" role="menubar">\n            <div class="edit-actions">\n                <button name="cancel" class="ha-button edit-cancel">{{editModeCancelText}}</button>\n                <button name="save" class="ha-button edit-save">{{editModeSaveText}}</button>\n            </div>\n        </div>\n    </div>\n    <div class="grid-node"></div>\n    <span class="table-escape-node" tabindex="-1" aria-label="table escaped"></span>\n</template>\n';});



define('text!hui/table/print.html',[],function () { return '<!doctype html>\n<html lang="en">\n    <head>\n        <meta charset="UTF-8">\n        <title>Print table</title>\n        <style>{{{dgridCss}}}</style>\n        <style>\n            body {\n                font-family: {{{printListFontFamily}}};\n            }\n\n            .dgrid-header-row {\n                position: static;\n            }\n\n            .dgrid-scroller {\n                margin-top: 0;\n            }\n\n            .noprint,\n            .print .tablebar {\n                display: none;\n            }\n\n            .print .numeric,\n            .print .right {\n                text-align: right;\n            }\n        </style>\n        {{{customCss}}}\n    </head>\n\n    <body>\n        <h1>{{printListTitleText}}</h1>\n        <div class="subTitle">{{printListSubTitleText}}</div>\n        <div role="grid" class="dgrid dgrid-grid ui-widget grid-node dgrid-autoheight print">{{{gridContent}}}</div>\n\n        <script>\n            window.print();\n        </script>\n    </body>\n</html>\n';});



define('text!dgrid-0.4/css/dgrid.css',[],function () { return '/* This stylesheet provides the structural CSS for the dgrid */\n.dgrid {\n\tposition: relative;\n\toverflow: hidden; /* This is needed by IE to prevent crazy scrollbar flashing */\n\tborder: 1px solid #ddd;\n\theight: 30em;\n\tdisplay: block;\n}\n\n.dgrid-header {\n\tbackground-color: #eee;\n}\n\n.dgrid-header-row {\n\tposition: absolute;\n\tright: 17px; /* scrollbar width; revised in List.js if necessary */\n\tleft: 0;\n}\n\n.dgrid-header-scroll {\n\tposition: absolute;\n\ttop: 0;\n\tright: 0;\n}\n\n.dgrid-footer {\n\tposition: absolute;\n\tbottom: 0;\n\twidth: 100%;\n}\n\n.dgrid-header-hidden {\n\t/*\n\t\tUsed to "hide" header, without losing size information for reference.\n\t\t!important is used to supersede theme styles at higher specificity.\n\t\tLeft/right box styles are untouched, as they may influence width of\n\t\t.dgrid-content as updated in Grid\'s resize method.\n\t*/\n\tfont-size: 0; /* allow shrinkage in IE Quirks mode for Lists */\n\theight: 0 !important;\n\tborder-top: none !important;\n\tborder-bottom: none !important;\n\tmargin-top: 0 !important;\n\tmargin-bottom: 0 !important;\n\tpadding-top: 0 !important;\n\tpadding-bottom: 0 !important;\n}\n\n.dgrid-footer-hidden {\n\t/* Hiding footer is much simpler; simply set its display to none. */\n\tdisplay: none;\n}\n\n.dgrid-sortable {\n\tcursor: pointer;\n}\n.dgrid-header, .dgrid-header-row, .dgrid-footer {\n\toverflow: hidden;\n\tbackground-color: #eee;\n}\n\n.dgrid-row-table {\n\tborder-collapse: collapse;\n\tborder: none;\n\ttable-layout: fixed;\n\tempty-cells: show;\n\twidth: 100%;\n\theight: 100%;\n}\n.dgrid-cell {\n\tpadding: 3px;\n\ttext-align: left;\n\toverflow: hidden;\n\tvertical-align: top;\n\tborder: 1px solid #ddd;\n\tborder-top-style: none;\n\n\tbox-sizing: border-box;\n\t-moz-box-sizing: border-box;\n\t-ms-box-sizing: border-box;\n\t-webkit-box-sizing: border-box;\n}\n\n.dgrid-content {\n\tposition: relative;\n\theight: 99%;\n}\n\n.dgrid-scroller {\n\toverflow-x: auto;\n\toverflow-y: scroll;\n\tposition: absolute;\n\ttop: 0px;\n\tmargin-top: 25px; /* this will be adjusted programmatically to fit below the header*/\n\tbottom: 0px;\n\twidth: 100%;\n}\n\n.dgrid-preload {\n\t/* Force IE6 to honor 0 height */\n\tfont-size: 0;\n\tline-height: 0;\n}\n\n.dgrid-loading {\n\tposition: relative;\n\theight: 100%;\n}\n.dgrid-above {\n\tposition: absolute;\n\tbottom: 0;\n}\n\n.ui-icon {\n\twidth: 16px;\n\theight: 16px;\n\tbackground-image: url(\'images/ui-icons_222222_256x240.png\');\n}\n\n.ui-icon-triangle-1-e {\n\tbackground-position: -32px -16px;\n}\n.ui-icon-triangle-1-se {\n\tbackground-position: -48px -16px;\n}\n\n.dgrid-expando-icon {\n\twidth: 16px;\n\theight: 16px;\n}\n.dgrid-tree-container {\n\t-webkit-transition-duration: 0.3s;\n\t-moz-transition-duration: 0.3s;\n\t-ms-transition-duration: 0.3s;\n\t-o-transition-duration: 0.3s;\n\ttransition-duration: 0.3s;\n\toverflow: hidden;\n}\n.dgrid-tree-container.dgrid-tree-resetting {\n\t-webkit-transition-duration: 0;\n\t-moz-transition-duration: 0;\n\t-ms-transition-duration: 0;\n\t-o-transition-duration: 0;\n\ttransition-duration: 0;\n}\n\n/* Single Sort */\n.dgrid-sort-arrow {\n\tbackground-position: -64px -16px;\n\tdisplay: block;\n\tfloat: right;\n\tmargin: 0 4px 0 5px;\n\theight: 12px;\n}\n.dgrid-sort-up .dgrid-sort-arrow {\n\tbackground-position: 0px -16px;\n}\n\n/* selection*/\n.dgrid-selected {\n\tbackground-color: #bfd6eb;\n}\n\n.dgrid-input {\n\twidth: 99%;\n}\n\nhtml.has-mozilla .dgrid .dgrid-row:focus,\nhtml.has-mozilla .dgrid .dgrid-cell:focus {\n\t/* Fix: Firefox\'s focus outline doesn\'t work by default for divs prior to actually tabbing into it */\n\toutline: 1px dotted;\n}\n\nhtml.has-mozilla .dgrid-focus {\n\t/* Tighten outline to fit within cells (avoids cutting off top/bottom outlines) */\n\toutline-offset: -1px;\n}\n\n/* will be used to calculate the width of the scrollbar */\n.dgrid-scrollbar-measure {\n\twidth: 100px;\n\theight: 100px;\n\toverflow: scroll;\n\tposition: absolute;\n\ttop: -9999px;\n}\n\n/* Styles for auto-height grids; simply add the dgrid-autoheight class */\n.dgrid-autoheight {\n\theight: auto;\n}\n.dgrid-autoheight .dgrid-scroller {\n\tposition: relative;\n\toverflow-y: hidden;\n}\n.dgrid-autoheight .dgrid-header-scroll {\n\tdisplay: none;\n}\n.dgrid-autoheight .dgrid-header {\n\tright: 0;\n}\n\n/* indicator of a successful load */\n#dgrid-css-dgrid-loaded {\n\tdisplay: none;\n}';});


define('hui/table-column',[
    'register-component/v2/register',
    'register-component/v2/UIComponent',
    'object-utils/classes'
], function(register, UIComponent, classes) {
    function defineAndUpdate(object, property) {
        Object.defineProperty(object, property, {
            set: function(value) {
                this['_' + property] = value;
                this.emit('column-change');
            },
            get: function() {
                return this['_' + property];
            }
        });
    }

    var HATableColumn = classes.createObject(UIComponent, /** @lends HATableColumn# */ {
        /** @constructs */
        init: function _() {
            _.super(this);

            this.setupProperties({
                field: {
                    type: String,
                    default: ''
                },
                label: {
                    type: String,
                    default: ''
                },
                headerText: {
                    type: String,
                    default: ''
                },
                id: {
                    // TODO: is this needed?
                    type: String,
                    default: ''
                },
                className: {
                    type: String,
                    default: ''
                },
                sortable: {
                    type: Boolean,
                    default: false
                },
                minWidth: {
                    type: Number,
                    default: 40
                },
                width: {
                    type: Number,
                    default: null
                },
                resizable: {
                    type: Boolean,
                    default: true
                },
                hidden: {
                    type: Boolean,
                    default: false
                },
                unhidable: {
                    type: Boolean,
                    default: false
                },
                'edit-on': {
                    type: String,
                    default: ''
                },
                editable: {
                    type: Boolean,
                    default: false
                }
            });

            defineAndUpdate(this, 'renderCell');
            defineAndUpdate(this, 'renderPrintCell');
            defineAndUpdate(this, 'renderHeaderCell');
            defineAndUpdate(this, 'formatter');
        },

        attributeChangedCallback: function _(attribute, oldValue, newValue) {
            _.super(this, attribute, oldValue, newValue);
            this.emit('column-change', {
                attribute: attribute,
                value: newValue
            });
        },

        getColumnDefinition: function() {
            var editable = this.editable,
            // This is true if the attribute doesn't exist, or if it exists and
            // is not set to false
            sortable = !(this.hasAttribute('sortable') && this.getAttribute('sortable') === 'false');
            return {
                label: this.label,
                field: this.field,
                editor: editable && 'text',
                editOn: editable && this['edit-on'],
                renderCell: this.renderCell,
                renderHeaderCell: this.renderHeaderCell,
                renderPrintCell: this.renderPrintCell,
                formatter: this.formatter,
                sortable: sortable
            };
        }
    });

    return register('ha-table-column', HATableColumn);
});

/**
 * @module
 * @class HATable
 * The ha-table component, which wraps dgrid and provides additional, custom
 * functionality such as custom editing, row reordering, content groups, filtering,
 * and batch action mode
 */
define('hui/table',[
    'require',
    'register-component/v2/register',
    'register-component/v2/UIComponent',
    'object-utils/classes',
    './core/utils',
    './core/a11y',
    './core/deviceUtils',
    './core/event',
    './helpers/string.helper',
    './table/TableBase',
    './table/RowEditingRenderer',
    './table/RowExpansionRenderer',
    './table/responsive/StackedRenderer',
    './table/responsive/ColumnLockingRenderer',
    './table/responsive/ResponsiveDefaultRenderer',
    'register-component/template!./table/table.html',
    'register-component/template!./table/print.html',
    'register-component/template!dgrid/css/dgrid.css',
    './table-column',
    './radio-button',
    './radio-button-group',
    './checkbox',
    './drawer-large',
    './popover',
    './popover-form',
    './tags',
    './page-message'
], function(require,
            register,
            UIComponent,
            classes,
            utils,
            a11y,
            deviceUtils,
            eventUtil,
            stringHelper,
            TableBase,
            RowEditingRenderer,
            RowExpansionRenderer,
            StackedRenderer,
            ColumnLockingRenderer,
            ResponsiveDefaultRenderer,
            template,
            printTemplate,
            dgridCss) {
    var YesNoType = utils.YesNoType,
        HATable,
        FORM_ELEMENT_NAMES = [
            'ha-checkbox',
            'ha-radio-button-group',
            'ha-select',
            'ha-select-type-ahead',
            'ha-text-field',
            'ha-text-field-type-ahead'
        ];

    HATable = classes.createObject(UIComponent, /** @lends HATable# */ {
        /** @constructs */
        init: function _() {
            _.super(this);

            /**
             * the filterNodes property which will be accessible through accessor methods
             * @type {HTMLElement[]}
             * @private
             */
            this._filterNodes = null;

            // all of these properties directly map to dgrid properties and simply call ._set()
            /** @lends HATable# */
            var properties = {
                /**
                 * The render modes to retrieve
                 * @type {Object}
                 * @default
                 */
                renderMode: '',
                /**
                 * The selection mode of the table.
                 * multiple, single, none, extended, and toggle
                 * @type {string}
                 * @default
                 */
                selectionMode: 'toggle',
                /**
                 * Allows all rows on the page to be selected if true
                 * @type {boolean}
                 * @default
                 */
                allowSelectAll: true,
                /**
                 * The loading message to display when the table is gathering data to show
                 * @type {string}
                 * @default
                 */
                loadingMessage: '<div class="infinite-loader"></div><span class="sr-only">Loading</span>',
                /**
                 * The message to display when there is no data in the table
                 * @type {string}
                 * @default
                 */
                noDataMessage: '<p class="ha-table-no-data">No data available</p>',
                /**
                 * The status text for pagination, showing the start, end and total
                 * The string must contain ${start}, ${end}, and ${total} tokens
                 * @type {string}
                 * @default
                 */
                paginationText: '${start}-${end} of ${total}',
                /**
                 * The text to use for the first page button in pagination
                 * @type {string}
                 * @default
                 */
                paginationFirstText: '< First',
                /**
                 * The text to use for the previous page button in pagination
                 * @type {string}
                 * @default
                 */
                paginationPreviousText: 'Previous',
                /**
                 * The text to use for the next page button in pagination
                 * @type {string}
                 * @default
                 */
                paginationNextText: 'Next',
                /**
                 * The text to use for the last page button in pagination
                 * @type {string}
                 * @default
                 */
                paginationLastText: 'Last >',
                /**
                 * The text value to set as the ARIA label of the pagination node
                 * @type {string}
                 * @default
                 */
                paginationAriaLabel: 'table pagination',
                /**
                 * The text value to display in the 'Apply' button in the settings drawer on mobile
                 * @type {string}
                 * @default
                 */
                settingsApplyButtonLabel: 'Apply',
                /**
                 * The text value to display in the 'Reset' button in the settings drawer on mobile
                 * @type {string}
                 * @default
                 */
                settingsResetButtonLabel: 'Reset',
                /**
                 * The text value to display in the title of the settings drawer on mobile
                 * @type {string}
                 * @default
                 */
                settingsTitleText: 'Table Settings',

                /**
                 * Whether or not to show sort options on mobile
                 * @type {boolean}
                 * @default
                 */
                showMobileSortOptions: true,
                /**
                 * The text value to display as the title of the sort options in the mobile settings drawer
                 * @type {string}
                 * @default
                 */
                mobileSortingText: 'Sort by',
                /**
                 * The text value to display as the title of the sort order option in the mobile settings drawer
                 * @type {string}
                 * @default
                 */
                mobileSortOrderText: 'Sort order',
                /**
                 * The text to display as the ascending sort option in the mobile settings drawer
                 * @type {string}
                 * @default
                 */
                mobileSortAscendingText: 'Ascending',
                /**
                 * The text to display as the descending sort option in the mobile settings drawer
                 * @type {string}
                 * @default
                 */
                mobileSortDescendingText: 'Descending',

                /**
                 * If set, any item in the table where property is set will be displayed as a header, and will have a dropdown button to expose child data beneath it.
                 * @type {string}
                 * @default
                 */
                categoryProperty: '',
                /**
                 * If true, expand all category rows
                 * @type {boolean}
                 * @default
                 */
                expandAll: false,
                /**
                 * Whether to allow batch mode, injecting an additional batch column into the table
                 * @type {boolean}
                 * @default
                 */
                allowBatchMode: false,
                /**
                 * The ARIA label to apply to the batch mode checkboxes
                 * @type {string}
                 * @default
                 */
                batchCellAriaLabel: 'batch edit',
                /**
                 * The ARIA label to apply to the batch mode checkboxes
                 * @type {string}
                 * @default
                 */
                batchSelectAriaLabel: 'select this row',
                /**
                 * The ARIA label to apply to the batch mode select all checkbox
                 * @type {string}
                 * @default
                 */
                batchSelectAllAriaLabel: 'Select all rows for editing',

                /**
                 * The ARIA label to apply to the batch mode select all header
                 * @type {string}
                 * @default
                 */
                batchSelectAllHeaderAriaLabel: 'Select rows for editing',

                /**
                 * Turns on or off drag and drop row reordering
                 * @type {boolean}
                 * @default
                 */
                allowRowReordering: false,
                /**
                 * Turns on or off row deletion
                 * @type {boolean}
                 * @default
                 */
                allowRowDeletion: false,
                /**
                 * Whether to show the table header row or not
                 * @type {boolean}
                 */
                showHeader: true,

                /**
                 * Whether to show the table footer or not
                 * @type {boolean}
                 */
                showFooter: true,
                /**
                 * indicator for whether the table is in print mode.
                 * @type {Boolean}
                 */
                print: false,
                /**
                 * The i18n label for the Total row
                 * @type {string}
                 * @default
                 */
                totalText: 'TOTAL',
                /**

                 * @name editMode
                 * @type {String}
                 * The type edit that is currently allowed on the table
                 * Allowed values are "specific" and anything else
                 */
                editMode: '',

                /**
                 * The number of rows to keep rendered beyond each end of the currently visible area of the component.
                 * @type {number}
                 * @default
                 */
                bufferRows: 10,
                /**
                 * The minimum distance (in pixels) which must exist between the currently visible area and
                 * previously-rendered rows before they are removed from the DOM.
                 * @type {number}
                 * @default
                 */
                farOffRemoval: 2000,
                /**
                 * The maximum size (in pixels) of unrendered space below or above the rendered portion of the
                 * component; default is Infinity, which indicates that the size of unrendered space should
                 * approximate the total space which would be occupied by all items in the result set.
                 * @type {number}
                 * @default
                 */
                maxEmptySpace: Infinity,
                /**
                 * The maximum number of items that will be requested at one time while scrolling.
                 * @type {number}
                 * @default
                 */
                maxRowsPerPage: 250,
                /**
                 * The minimum number of items that will be requested at one time while scrolling.
                 * @type {number}
                 * @default
                 */
                minRowsPerPage: 25,
                /**
                 * Specifies the number of milliseconds to debounce or throttle scroll handler calls
                 * (and thus also potential store requests).
                 * @type {number}
                 * @default
                 */
                pagingDelay: 15,
                /**
                 * Specifies the method from the dgrid/util/misc module to use for throttling the scroll handler;
                 * defaults to "debounce" to wait until scrolling stops, but can also be set to "throttleDelayed"
                 * to load even as scrolling continues.
                 * @type {string}
                 * @default
                 */
                pagingMethod: 'debounce',
                /**
                 * Specifies the number of items to overlap between queries, which helps ensure consistency
                 * of observed updates to items at page boundaries.
                 * @type {number}
                 * @default
                 */
                queryRowsOverlap: 0,

                /**
                 * Specifies the deletion icon class to use for the row delete option.
                 * @type {String}
                 * @default
                 */
                deletionIconClass: 'hi-delete'
            }, attributes = {};

            Object.keys(properties).forEach(function(property) {
                var value = properties[property];
                attributes[property] = {
                    type: utils.type(value),
                    default: value,
                    change: function(value) {
                        this._set(property, value);
                    }
                };
            });
            this.setupProperties(attributes);

            this.setupProperties(/** @lends HATable# */ {
                /**
                 * toggleable property to set compact mode
                 * @type {boolean}
                 * @default false
                 */
                compact: {
                    default: false,
                    type: YesNoType,
                    change: function(compact) {
                        this.classList[compact ? 'add' : 'remove']('compact');
                        this._compactCheckbox.checked = this.compact;
                        this._saveSettings();
                    }
                },
                /**
                 * The number of rows to show per page
                 * @name rowsPerPage
                 * @type {Number}
                 */
                rowsPerPage: {
                    default: 150,
                    type: Number,
                    change: function(value) {
                        this._set('rowsPerPage', value);
                        this._rowsPerPageGroup.value = value;
                        this._saveSettings();
                    }
                },
                /**
                 * Hides the table bar if false, else shows the table bar if there is content in it
                 * @type {boolean}
                 */
                showTableBar: {
                    type: YesNoType,
                    default: true,
                    change: function() {
                        this._refreshTableBar();
                    }
                },
                /**
                 * The type of filter to be applied to the table.
                 * Possible values are 'simple-find', 'simple-filter', and 'complex-filter'
                 * @type {string}
                 */
                filterType: {
                    default: '',
                    type: String,
                    change: function() {
                        this._renderFilter();
                        this._refreshTableBar();
                    }
                },
                /**
                 * Placehodler text for the 'simple-find' filter type
                 * @type {string}
                 */
                simpleFindPlaceholderText: {
                    default: '',
                    type: String
                },
                /**
                 * Shows the edit button in the tablebar is true
                 * @type {boolean}
                 * @default false
                 */
                showEditMode: {
                    default: false,
                    type: YesNoType,
                    change: function() {
                        this._refreshTableBar();
                    }
                },
                /**
                 * The text value for the edit cancel button
                 * @type {string}
                 * @default Cancel
                 */
                editModeCancelText: {
                    default: 'Cancel',
                    type: String
                },
                /**
                 * The text value for the edit save button
                 * @type {string}
                 * @default Save
                 */
                editModeSaveText: {
                    default: 'Save',
                    type: String
                },
                /**
                 * Shows the print icon in the tablebar if true
                 * @type {boolean}
                 * @default false
                 */
                showPrintList: {
                    default: false,
                    type: YesNoType,
                    change: function() {
                        this._refreshTableBar();
                    }
                },
                /**
                 * Shows the export icon if true
                 * @type {boolean}
                 * @default false
                 */
                showExport: {
                    default: false,
                    type: YesNoType,
                    change: function() {
                        this._refreshTableBar();
                    }
                },
                /**
                 * Shows the settings icon if true
                 * @type {boolean}
                 * @default false
                 */
                showSettings: {
                    default: false,
                    type: YesNoType,
                    change: function() {
                        this._refreshTableBar();
                    }
                },
                /**
                 * Show the column hider section in the settings if true
                 * @type {boolean}
                 * @default true
                 */
                showColumnHider: {
                    default: true,
                    type: YesNoType,
                    change: function(showColumnHider) {
                        if (this._columnHiderNode) {
                            if (showColumnHider) {
                                this._updateColumnHider();
                                this._columnHiderNode.classList.remove('hidden');
                            } else {
                                this._columnHiderNode.classList.add('hidden');
                            }
                        }
                    }
                },
                /**
                 * Show the display density option in settings if true
                 * @type {boolean}
                 * @default false
                 */
                showDisplayDensitySettings: {
                    default: false,
                    type: YesNoType,
                    change: function(showDisplayDensitySettings) {
                        if (this._displayDensityNode) {
                            if (showDisplayDensitySettings) {
                                this._displayDensityNode.classList.remove('hidden');
                            } else {
                                this._displayDensityNode.classList.add('hidden');
                            }
                        }
                    }
                },
                /**
                 * Show the Rows Per Page option in settings if true
                 * @type {boolean}
                 * @default false
                 */
                showRowsPerPageSettings: {
                    default: false,
                    type: YesNoType,
                    change: function(showRowsPerPageSettings) {
                        if (this._rowsPerPageNode) {
                            if (showRowsPerPageSettings) {
                                this._rowsPerPageNode.classList.remove('hidden');
                            } else {
                                this._rowsPerPageNode.classList.add('hidden');
                            }
                        }
                    }
                },
                /**
                 * optional link to a CSS file that will be loaded when printing a table
                 * @type {string}
                 */
                printListAdditionalCSSFile: {
                    default: '',
                    type: String
                },

                printListFontFamily: {
                    default: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                    type: String
                },
                /**
                 * Displayed when printing a table
                 * @type {string}
                 */
                printListTitleText: {
                    default: '',
                    type: String
                },
                /**
                 * Displayed when printing a table
                 * @type {string}
                 */
                printListSubTitleText: {
                    default: '',
                    type: String
                },

                /**
                 * The text to display in the batch selection label for singular items
                 * @type {string}
                 * @default {count} item selected
                 */
                batchItemSelectedText: {
                    default: '{count} item selected',
                    type: String
                },

                /**
                 * The text to display in the batch selection label for plural items
                 * @type {string}
                 * @default {count} items selected
                 */
                batchItemsSelectedText: {
                    default: '{count} items selected',
                    type: String
                },

                /**
                 * The text value for the Edit button
                 * @type {string}
                 * @default Edit Table
                 */
                editIconText: {
                    default: 'Edit Table',
                    type: String,
                    change: function(editIconText) {
                        this._setIconA11yText('edit', editIconText);
                    }
                },
                /**
                 * The text value for the Print button
                 * @type {string}
                 * @default Print Table
                 */
                printIconText: {
                    default: 'Print Table',
                    type: String,
                    change: function(printIconText) {
                        this._setIconA11yText('print', printIconText);
                    }
                },
                /**
                 * The text value for the Export button
                 * @type {string}
                 * @default Export Table
                 */
                exportIconText: {
                    default: 'Export Table',
                    type: String,
                    change: function(exportIconText) {
                        this._setIconA11yText('export', exportIconText);
                    }
                },
                /**
                 * The text value for the Settings button
                 * @type {string}
                 * @default View Table Settings
                 */
                settingsIconText: {
                    default: 'View Table Settings',
                    type: String,
                    change: function(settingsIconText) {
                        this._setIconA11yText('settings', settingsIconText);
                    }
                },
                /**
                 * Optional parameter specifying a persistentId(across sessions) for this table;
                 * needs to be specified, along with userId, in order for sort configuration to be
                 * saved across sessions.
                 * @type {string}
                 */
                persistentId: {
                    default: '',
                    type: String,
                    change: function(persistentId) {
                        this._set('persistentId', persistentId);
                        this._loadSettings();
                    }
                },
                /**
                 * Optional parameter specifying the ID of the currently logged in user;
                 * needs to be specified, along with persistentId, in order for sort configuration
                 * to be saved across sessions.
                 * @type {string}
                 */
                userId: {
                    default: '',
                    type: String,
                    change: function(userId) {
                        this._set('userId', userId);
                        this._loadSettings();
                    }
                },
                /**
                 * The text value for the "Display density" section's "Compact" checkbox label
                 * @type {string}
                 * @default Compact
                 */
                compactText: {
                    default: 'Compact',
                    type: String,
                    change: function(compactText) {
                        if (this._compactCheckbox) {
                            this._compactCheckbox.label = compactText;
                        }
                    }
                },
                /**
                 * The text value for the "Edit columns" (column hider) section heading
                 * @type {string}
                 * @default Edit columns
                 */
                editColumnsText: {
                    default: 'Edit columns',
                    type: String,
                    change: function(text) {
                        if (this._columnHiderNode && this._columnHiderNode.firstElementChild) {
                            this._columnHiderNode.firstElementChild.textContent = text;
                        }
                    }
                },
                /**
                 * The text value for the "Display density" section heading
                 * @type {string}
                 * @default Display density
                 */
                displayDensityText: {
                    default: 'Display density',
                    type: String,
                    change: function(displayDensityText) {
                        this._displayDensityNode.firstElementChild.textContent = displayDensityText;
                    }
                },
                /**
                 * The text value for the "Rows per page" section heading
                 * @type {string}
                 * @default Rows per page
                 */
                rowsPerPageText: {
                    default: 'Rows per page',
                    type: String,
                    change: function(rowsPerPageText) {
                        if (this._rowsPerPageNode) {
                            this._rowsPerPageNode.firstElementChild.textContent = rowsPerPageText;
                        }
                    }
                },
                /**
                 * whether the table should auto-adjust its height
                 * @type {Boolean}
                 */
                autoheight: {
                    type: YesNoType,
                    default: false,
                    change: function(value) {
                        this._set('autoheight', value);
                        this._setMaxHeight(value ? null : this.maxHeight);
                    }
                },
                /**
                 * Max height for the grid
                 * @type {Number}
                 */
                maxHeight: {
                    default: 480,
                    type: Number,
                    change: function(maxHeight) {
                        this._setMaxHeight(maxHeight);
                    }
                },

                /**
                 * @type {Boolean}
                 * whether the table is in an editable state
                 */
                editable: {
                    default: false,
                    type: YesNoType,
                    change: function(value) {
                        this._set('editable', value);
                        this.setEditModeEnabled(value);
                        this._callIfExists('_togglePaginationButtons', !value);

                        if (value) {
                            this.showAllHiddenColumns();
                        }
                    }
                },

                /**
                 * The number of columns to lock to the side of the screen
                 * @type {number}
                 */
                lockedColumns: {
                    default: 0,
                    type: Number,
                    change: function(newValue) {
                        this._callIfExists('_setLockedColumns', newValue);
                    }
                },

                /**
                 * The filter text
                 * @type {string}
                 */
                activeFiltersText: {
                    default: 'Filters Active ({{count}})',
                    type: String,
                    change: function() {
                        this._refreshFilterStatus();
                    }
                },

                /**
                 * Turn on/off row editing
                 * @type {Boolean}
                 */
                allowRowEditing: {
                    default: false,
                    type: Boolean,
                    change: function(newValue) {
                        if (newValue) {
                            this._enableRowEditing();
                        } else {
                            this._disableRowEditing();
                        }
                    }
                },

                /**
                 * The text that should appear on the row editor, if a save button is visible.
                 */
                rowEditSaveText: {
                    default: 'Save',
                    type: String
                },

                /**
                 * The text that should appear as the title of the row editor, if the title is visible.
                 */
                rowEditTitle: {
                    default: '',
                    type: String
                },

                /**
                 * The text that should appear on the option to cancel row editing
                 */
                rowEditCancelText: {
                    default: 'Cancel',
                    type: String
                }
            });

            /**
             * The template value
             */
            this.template = template;

            this._columns = this._getColumns();
            this.originalColumns = utils.clone(this._columns);
        },

        postRender: function() {
            a11y.addA11yFocus(this);
            /**
             * The toolbar node
             * @protected
             */
            this._toolbarNode = this.querySelector('.tablebar');

            /**
             * The grid node
             * @protected
             */
            this._gridNode = this.querySelector('.grid-node');

            //this._editPopover = this._toolbarNode.querySelector('ha-popover.edit');
            this._settingsIconButton = this._toolbarNode.querySelector('button[name="settings"]');
            this._editIconButton = this._toolbarNode.querySelector('button[name="edit"]');
            this._printIconButton = this._toolbarNode.querySelector('button[name="print"]');
            this._exportIconButton = this._toolbarNode.querySelector('button[name="export"]');
            this._defaultNode = this.querySelector('.tablebar-default');

            if (deviceUtils.isMobile()) {
                this._settingsPopover = this._toolbarNode.querySelector('.ha-table-settings-popover');

                if (this._settingsPopover) {
                    this._settingsPopover.parentNode.removeChild(this._settingsPopover);
                    this._settingsPopover = null;
                }

                this._settingsDrawer = this._renderSettingsDrawer();
            } else {
                this._settingsPopover = this._toolbarNode.querySelector('.ha-table-settings-popover');
                this._columnHiderNode = this._settingsPopover.querySelector('.column-hider');
                this._displayDensityNode = this._settingsPopover.querySelector('.display-density');

                var compactCheckbox = document.createElement('ha-checkbox');
                compactCheckbox.name = 'compactCheckbox';
                compactCheckbox.label = this.compactText;
                this._displayDensityNode.appendChild(compactCheckbox);

                this._compactCheckbox = this._displayDensityNode.querySelector('ha-checkbox[name=compactCheckbox]');
                this._rowsPerPageNode = this._settingsPopover.querySelector('.rows-per-page');
                this._rowsPerPageGroup = this._rowsPerPageNode.querySelector('ha-radio-button-group[name=rowsPerPage]');
                this.otherSettingsNode = this._settingsPopover.querySelector('.custom');

                eventUtil.on(this._settingsPopover, '.edit-columns ha-checkbox:change', this._onChangeEditColumn.bind(this));
                eventUtil.on(this._settingsPopover, '.display-density ha-checkbox:change', this._onChangeDisplayDensity.bind(this));
                eventUtil.on(this._settingsPopover, '.rows-per-page ha-radio-button-group:change', this._onChangeRowsPerPage.bind(this));
            }

            this.listenTo(this._defaultNode, 'button:click', function(event) {
                var name = event.target.name,
                    method = this['_onClick' + name.charAt(0).toUpperCase() + name.slice(1)];

                /* istanbul ignore else */
                if (method) {
                    method.call(this, event);
                }
            }.bind(this));

            this.table = this._createGrid();
            // HUI-4213: Wait for row to expand before recalculating height
            var recalculateHeight = function() {
                setTimeout(this._calculateInitialHeight.bind(this), 500);
            }.bind(this);
            this.on('table-resize', recalculateHeight);

            this._batchNode = this.querySelector('.batch-node');
            this._batchBarNode = this.querySelector('.tablebar-batch');
            this._batchCountNode = this.querySelector('.batch-count');

            this._editNode = this.querySelector('.tablebar-edit');
            this._filterNode = this.querySelector('.filter-node');

            // Custom nodes in the table bar to add content to
            this.tableBarCustomNode = this.querySelector('.custom-node');
            this.tableBarCustomActionNode = this.querySelector('.custom-action-node');

            /**
             * The current state of the batch mode
             * @type {Boolean}
             * @private
             */
            this._batchModeEnabled = false;
            this.on('ha-table-column:column-change', function() {
                this.columns = this._getColumns();
            }.bind(this));

            this.on('batch-select', function() {
                this._checkBatchMode(true);
            }.bind(this));

            this.on('batch-deselect', function(event) {
                this._checkBatchMode();
                this.clearErrors(event.rows.map(function(row) {
                    return row.id;
                }));
            }.bind(this));

            this._calculateInitialHeight();
            this.on('row-remove', this._adjustHeight.bind(this, false));
            this.on('row-insert', this._adjustHeight.bind(this, true));

            this.on('refresh-complete', function() {
                this._refreshTableBar();
                if (!this.table.gotoPage) {
                    this._calculateInitialHeight();
                } else {
                    // Make sure we still reset any adjusted styles
                    this.table.resetParentStyles();
                }
            }.bind(this));

            // listen to the editor buttons and emit events
            this.listenTo(this.querySelector('.edit-cancel'), 'click', this.onEditCancel.bind(this));
            this.listenTo(this.querySelector('.edit-save'), 'click', this.onEditSave.bind(this));

            this._loadSettings();
            this._addRenderModes();

            this._rowExpansion = true;
            this._rowExpansionRenderer = null;
        },

        detachedCallback: function() {
            var settingsContainer = this._settingsPopover || this._settingsDrawer;

            if (settingsContainer.parentElement) {
                settingsContainer.parentElement.removeChild(settingsContainer);
            }
        },

        /**
         * Set the max height of the table
         * @param {number|null} height - the max height to set on the table dom node
         * @private
         */
        _setMaxHeight: function(height) {
            var node = this._get('domNode');
            if (height) {
                height = height + 'px';
            }
            /* istanbul ignore else */
            if (node) {
                node.style.maxHeight = height;
            }
        },

        /**
         * calculate the initial height of the table, adjusting to it
         * can be the exact height needed to a certain maxHeight and then not grow
         * past that
         * @private
         */
        _calculateInitialHeight: function(event) {
            // See OnDemandContentGroups#_processScroll for info on '_isProcessingScroll'
            if (this._get('_isProcessingScroll') && event && event.type === 'table-resize') {
                return;
            }

            var dgrid = this._get('domNode'),
                height = 0,
                minHeight = 124;

            if (dgrid) {

                /* istanbul ignore else */
                if (this.table.headerNode) {
                    height += this.table.headerNode.offsetHeight;
                }

                /* istanbul ignore else */
                if (this.table.footerNode) {
                    height += this.table.footerNode.offsetHeight;
                }
                Array.prototype.forEach.call(this.querySelectorAll('.dgrid-row'), function(row) {
                    height += row.offsetHeight;
                });
                /**
                 * The height of the no data node the last time it was
                 * accounted for
                 * @type {Boolean}
                 * @private
                 */
                this._lastNoDataHeight = this.table.noDataNode ? this.table.noDataNode.offsetHeight : null;
                if (this._lastNoDataHeight) {
                    // add 35 for top margin on no-data node
                    height += this._lastNoDataHeight + 35;
                }

                // Make sure we maintain a minimum height in all cases
                height = Math.max(minHeight, height);

                dgrid.style.height = height + 'px';
            }

            this.table.resetParentStyles();
        },

        /**
         * Adjust the height of the grid based on when items are added
         * or removed
         * @param {Boolean} itemAdded - Whether an item was added or removed from the table
         * @param {Event} event - The event object
         * @private
         */
        _adjustHeight: function(itemAdded, event) {
            if (this._get('_cleanup') || this._get('_isProcessingScroll')) {
                return;
            }

            var dgrid = this._get('domNode'),
                heightStyle = dgrid.style.height,
                height = event.height,
                currentHeight = Number(heightStyle.substring(0, heightStyle.length - 2)),
                newHeight = itemAdded ? (currentHeight + height) : (currentHeight - height);

            if (itemAdded) {
                if (this._lastNoDataHeight) {
                    newHeight -= this._lastNoDataHeight;
                    this._lastNoDataHeight = null;
                }
            } else if (this.table.noDataNode) {
                this._lastNoDataHeight = this.table.noDataNode.offsetHeight;
                newHeight += this._lastNoDataHeight;
            }

            /* istanbul ignore else */
            if (!isNaN(newHeight)) {
                dgrid.style.height = newHeight + 'px';
            }
        },

        /**
         * The query that is applied to the collection. When the query is set, update the root collection
         */
        set query(query) {
            this._query = query;
            this._set('collection', query ? this._collection.filter(query) : this._collection);
            this.refresh();
        },

        get query() {
            return this._query;
        },

        /**
         * Check the current state of the selection on the table based
         * on select/deselect events
         * @param {Boolean} selecting
         * @protected
         */
        _checkBatchMode: function(selecting) {
            var numSelected = Object.keys(this.table.selection).reduce(function(total, key) {
                    return total + (this.table.selection[key] ? 1 : 0);
                }.bind(this), 0),
                contentString = (numSelected === 1 ? this.batchItemSelectedText : this.batchItemsSelectedText).replace(/\{count\}/, numSelected);

            this._batchCountNode.textContent = contentString;

            if (selecting && !this._batchModeEnabled) {
                this.setBatchModeActive(true);
            } else if (!numSelected && this._batchModeEnabled) {
                this.setBatchModeActive(false);
            }
            this._batchModeEnabled = !!numSelected;
        },

        attachedCallback: function() {
            if (this.table && !this.table._started) {
                this._callIfExists('startup');
            }
        },

        /**
         * Create the grid by calling the grid factory
         * This can be overwritten by other implementations (such as the virtual grid) to call
         * the factory with the appropriate options
         * @protected
         * @return {Grid}
         */
        _createGrid: function() {
            return TableBase.factory({
                table: this,
                virtual: false,
                columns: this._columns
            }, this._gridNode);
        },

        /**
         * update the a11y text for icon buttons
         * @protected
         */
        _setIconA11yText: function(icon, text) {
            var iconTextSpan = this.querySelector('.hi-' + icon + ' + .icon-text');
            if (iconTextSpan) {
                iconTextSpan.textContent = text;
            }
        },

        /**
         * Set a property on the dgrid isntance, if it exists
         * @param {String} property the property to set on the dgrid instance
         * @param {any} value the value to set on that property
         * @private
         */
        _set: function(property, value) {
            return this._callIfExists('set', property, value);
        },

        /**
         * Get a property on the dgrid instance, if it exists
         * @param {String} property the property to retrieve from the dgrid instance
         * @return {any} the value of the property from the dgrid instance
         * @private
         */
        _get: function(property) {
            return this._callIfExists('get', property);
        },

        /**
         * If the dgrid instance exists, call the method and pass the additional arguments to it.
         * Otherwise, do nothing
         * @param {String} method the method to check and call on the dgrid instance
         * @return {any} the return value  of the method call
         * @private
         */
        _callIfExists: function(method) {
            var args = Array.prototype.slice.call(arguments, 1);
            return this.table && this.table[method] && this.table[method].apply(this.table, args);
        },

        /**
         * Parse ha-table-column nodes and return a column definition
         * @return {Object} the column definition
         * @private
         */
        _getColumns: function() {
            var columnNodes = Array.prototype.map.call(this.querySelectorAll('ha-table-column'), function(column) {
                    return column.getColumnDefinition();
                }),
                columns = columnNodes.length ? columnNodes : this.columns;
            return columns;
        },

        /**
         * Add a new render mode to the table
         */
        addRenderMode: function() {
            this.table.addRenderMode.apply(this.table, arguments);
        },

        /**
         * Remove the render mode
         * @param {String} name The name of the render mode to remove
         */
        removeRenderMode: function(name) {
            this._callIfExists('removeRenderMode', name);
        },

        /**
         * The column definition, used by the dgrid instance
         * @type {Object|Array}
         */
        set columns(columns) {
            // Allow the render mode to cleanup setup
            // it may have related to the current column structure.
            if (this.renderMode && this.rendererFactory) {
                this.rendererFactory(this.renderMode, 'cleanup', this.table)(this.table);
            }

            this._columns = columns;
            this.originalColumns = utils.clone(columns, this.table ? [this.table] : []);
            this._set('columns', columns);
            this._updateColumnHider();
            this.updateFactorySettings();
            // Allow the render mode to perform setup with the new
            // column structure.
            if (this.renderMode && this.rendererFactory) {
                this.rendererFactory(this.renderMode, 'setup', this.table)(this.table);
            }
        },

        get columns() {
            return this._get('columns') || this._columns;
        },

        /**
         * Sort options for the table
         * @type {Array|Function}
         */
        set sort(sort) {
            this._set('sort', sort);
        },

        get sort() {
            return this._get('sort');
        },

        /**
         * The render modes to retrieve
         * @type {Object}
         */
        get renderModes() {
            return this._get('renderModes');
        },

        /**
         * Which fields can have edit toggled
         * Should only be set once when the table is created
         * @param {string[]} fields - the fields to make editable
         */
        set editableFields(fields) {
            this._set('editableFields', fields);
        },

        get editableFields() {
            return this._get('editableFields');
        },

        /**
         * Sets the element ot use for the export button.
         * @param {HTMLElement} exportButtonNode The element to use for the export button
         */
        set exportButton(exportButtonNode) {
            this._exportIconButton.parentNode.replaceChild(exportButtonNode, this._exportIconButton);
            this._exportIconButton = exportButtonNode;
        },

        get exportButton() {
            return this._editIconButton;
        },

        /**
         * If true, the table bar should be displayed
         * @type {boolean}
         */
        get hasToolbarContent() {
            return Boolean(this.filterType || this.showEditMode || this.allowBatchMode || this.showPrintList ||
                this.showExport || this.showSettings || this.otherSettingsNode);
        },

        /**
         * determine whetheer the TableBar should be shown
         * @return {Boolean}
         * @private
         */
        _shouldShowToolbar: function() {
            return this.showTableBar && !!(this.filterType || this.showEditMode || this.allowBatchMode || this.showPrintList || this.showExport || this.showSettings);
        },

        /**
         * The method to determine the row status, called for each row
         * @type {Function}
         */
        set rowStatus(rowStatus) {
            this._set('rowStatus', rowStatus);
        },

        get rowStatus() {
            return this._get('rowStatus');
        },

        /**
         * The dstore instance to be utilized by the store
         * @type {Object}
         */
        set collection(collection) {
            this._collection = collection;
            this._set('collection', collection);
        },

        get collection() {
            return this._get('collection');
        },

        /**
         * @private
         * Callback for the filter button click
         */
        _onClickFilter: function() {
            var popover = this.filterNodes[0];
            popover.show({detail: this.query});
        },

        /**
         * @private
         */
        _renderFilter: function() {
            var doc = this.ownerDocument,
                filterNode = this._filterNode,
                filterNodes = this.filterNodes,
                button,
                icon,
                srText,
                tags,
                textInput,
                searchContainer,
                cancelButton,
                originalTableBar;

            filterNode.innerHTML = '';
            filterNode.classList.remove('mobile-filter-bar');
            this._tags = null;

            if (this.filterType === 'complex') {
                button = doc.createElement('button');
                icon = doc.createElement('span');
                srText = doc.createElement('span');
                icon.classList.add('hi');
                icon.classList.add('hi-filter');
                icon.setAttribute('aria-hidden', true);
                srText.classList.add('sr-only');
                srText.textContent = 'Filter';
                button.name = 'filter';
                button.appendChild(icon);
                button.appendChild(srText);
                filterNode.appendChild(button);

                if (deviceUtils.isHandheld()) {
                    tags = this._filterStatus = doc.createElement('button');
                    tags.classList.add('filter-status');
                    tags.style.display = 'none';
                    tags.addEventListener('click', this._onClickFilter.bind(this));
                } else {
                    tags = this._tags = doc.createElement('ha-tags');
                    tags.maxDisplay = 3;
                }

                filterNode.appendChild(tags);

                if (filterNodes.length > 0) {
                    if (deviceUtils.isHandheld() && filterNodes[0].tagName === 'HA-POPOVER') {
                        filterNodes[0] = this._buildDrawerFromPopover(filterNodes[0]);
                        filterNodes[0].on('close', function() {
                            button.focus();
                        });
                    } else {
                        filterNodes[0].target = button;
                    }
                }
            } else if (this.filterType === 'simple' && deviceUtils.isHandheld() && filterNodes[0] && filterNodes[0].tagName === 'HA-TEXT-FIELD') {
                textInput = filterNodes[0];

                searchContainer = doc.createElement('div');
                searchContainer.className = 'mobile-table-filter table-bar tablebar-default';

                cancelButton = doc.createElement('button');
                cancelButton.textContent = 'Cancel';
                cancelButton.addEventListener('click', function() {
                    searchContainer.parentNode.insertBefore(originalTableBar, searchContainer);
                    searchContainer.classList.remove('visible');
                    this._defaultNode = originalTableBar;

                    setTimeout(function() {
                        searchContainer.parentNode.removeChild(searchContainer);

                        textInput.value = '';
                        textInput.emit('change');
                    }, 300);
                }.bind(this));

                button = doc.createElement('button');
                icon = doc.createElement('span');
                icon.classList.add('hi');
                icon.classList.add('hi-search');
                button.appendChild(icon);
                button.setAttribute('aria-label', 'Filter');

                searchContainer.appendChild(textInput);
                searchContainer.appendChild(cancelButton);

                button.addEventListener('click', function() {
                    // open
                    originalTableBar = filterNode.parentElement;
                    originalTableBar.parentElement.appendChild(searchContainer);
                    this._defaultNode = searchContainer;

                    setTimeout(function() {
                        searchContainer.classList.add('visible');

                        setTimeout(function() {
                            originalTableBar.parentElement.removeChild(originalTableBar);
                            textInput.focus();
                        }, 300);
                    }, 0);
                }.bind(this));

                textInput.on('input', function() {
                    textInput.emit('change');
                });

                filterNode.classList.add('mobile-filter-bar');

                filterNode.appendChild(button);

                filterNodes = [];

                textInput.classList.add('mobile-text-field-force-open');
            } else if (this.filterType === 'simple' && deviceUtils.isHandheld()) {
                filterNode.classList.add('mobile-filter-bar');
            }

            filterNodes.forEach(function(node) {
                filterNode.appendChild(node);
            });
        },

        /**
         * Sets a filter on the table so that only rows mawtching the
         * criteria will be displayed
         * @param {Object|Function} query the data to filter on. For a complex filter, it is expected to be an object.  IF a functon, it will be executed for every row in the store.
         * @param {Object} [labels] customizable labels to display in the complex filter
         */
        filter: function(query, labels) {
            query = query || {};
            var tags = this._tags, filterStatus = this._filterStatus;
            this.query = query;

            if (tags) {
                tags.tags = Object.keys(query).map(function(value) {
                    var tag = document.createElement('ha-tag');
                    tag.label = labels ? labels[value] || query[value] : query[value];
                    tag.value = value;
                    return tag;
                });
            } else if (filterStatus) {
                this._refreshFilterStatus();
            }
        },

        /**
         * @private
         * Refresh the filter status based on the filters used
         */
        _refreshFilterStatus: function() {
            var filterCount = Object.keys(this.query || {}).length,
                filterStatus = this._filterStatus;

            if (filterStatus) {
                if (!filterCount) {
                    filterStatus.style.display = 'none';
                } else {
                    filterStatus.style.display = 'inline-block';
                    filterStatus.textContent = stringHelper.replaceKeys(this.activeFiltersText, {
                        count: filterCount
                    });
                }
            }
        },

        /**
         * The nodes to use as the filter components
         * @param {HTMLElement[]} nodes -  the nodes to use as the filtering components
         */
        set filterNodes(nodes) {
            if (!this.filterType) {
                this.filterType = 'simple';
            }

            if (nodes.length && this.filterType === 'complex') {
                if (nodes.length > 1) {
                    throw new Error('filterNodes: the array can only be of length 1 when the filterType is "complex"');
                }

                if ((nodes[0]).tagName.toLowerCase() !== 'ha-popover') {
                    throw new Error('filterNodes: This property only accepts ha-popover elements when the filterType is "complex"');
                }
            } else {
                nodes.forEach(function(node) {
                    var name = node.nodeName.toLowerCase();
                    if (name !== 'ha-select' && name !== 'ha-text-field') {
                        throw new Error('filterNodes: This property only accepts ha-select and ha-text-field elements when the filterType is "simple"');
                    }
                });

            }

            this._filterNodes = nodes;

            this._renderFilter();
        },

        get filterNodes() {
            var nodes = this._filterNodes;
            if (!nodes) {
                nodes = this._filterNodes = [];
            }
            return nodes;
        },

        get selection() {
            return this._get('selection');
        },

        /**
         * @see collection
         */
        set store(store) {
            this._set('collection', store);
        },

        get store() {
            return this._get('collection');
        },

        /**
         * The element used to contain the footer of the table
         * @type {HTMLElement}
         */
        set footerTotalNode(footerTotalNode) {
            this._set('footerTotalNode', footerTotalNode);
        },

        get footerTotalNode() {
            return this._get('footerTotalNode');
        },

        /**
         * The nodes that will be displayed on the batch portion
         * of the tablebar
         * @type {HTMLElement[]}
         */
        set batchNodes(nodes) {
            var batchNode = this._batchNode;
            batchNode.innerHTML = '';
            nodes.forEach(function(node) {
                batchNode.appendChild(node);
            });
        },

        get batchNodes() {
            return Array.prototype.slice.call(this._batchNode.childNodes);
        },

        /**
         * the name of the batch field property
         * @type {string}
         */
        get batchField() {
            return this._get('batchField');
        },

        /**
         * The name of the row reordering field property
         * @type {String}
         */
        get rowReorderField() {
            return this._get('rowReorderField');
        },

        /**
         * The renderer factory to use
         */
        set rendererFactory(rendererFactory) {
            this._set('rendererFactory', rendererFactory);
            this._addRenderModes();
        },

        get rendererFactory() {
            return this._get('rendererFactory');
        },

        /**
         * Set the totals that will be displayed in the totals row
         * @param {Object} totals - Key-value pairs - the key is the column the pairs should
         * be set in, the value is the total to set
         */
        set totals(totals) {
            this._set('totals', totals);
        },

        get totals() {
            return this._get('totals');
        },

        /**
         * Set the category totals
         * @see _setCategoryTotals
         */
        set categoryTotals(categoryTotals) {
            this._set('categoryTotals', categoryTotals);
        },

        get categoryTotals() {
            return this._get('categoryTotals');
        },

        /**
         * Sets what mode to display in on mobile or tablet
         * @param {string} responsiveLayout A string that can be either 'stacked', 'columnLocking', or ''. These correspond
         * to the stacked, column locking, and default responsive rendering modes
         */
        set responsiveLayout(responsiveLayout) {
            this._responsiveLayout = responsiveLayout;
            if (deviceUtils.isHandheld()) {
                this.cancelRowEdit();
                this.renderMode = this._responsiveLayout ? responsiveLayout + 'Renderer' : 'default';
                this._prepareRowEditor();
            }
        },

        get responsiveLayout() {
            return this._responsiveLayout;
        },

        /**
         * Return the cell object from the given target. This calls dgrid's cell method
         * @param {number|Object} target The target referring to the cell
         * @return {Object}
         */
        cell: function(target) {
            return this._callIfExists('cell', target);
        },

        /**
         * Return the row object from the given target.
         * The target can be a row id, row data object, row HTML element, or an event that has the row as its target.
         * @param {number|Object|HTMLElement|Event} target The target referring to the row
         * @return {Object}
         */
        row: function(target) {
            return this._callIfExists('row', target);
        },

        /**
         * Loads the indicated page.
         * @param {number} page The page number to navigate to
         * @returns a promise yielding an object containing the rows rendered as well as the
         * results they represent. Note: Page numbers start at 1.
         */
        gotoPage: function(page) {
            return this._callIfExists('gotoPage', page);
        },

        /**
         * get the total number of rows in the table
         * @readonly
         * @private
         */
        get _total() {
            return this._get('_total');
        },

        /**
         * set an error on a given row
         * @param {number|Object} target - the target row to add an error to
         * @param {string} error the error message to display on the row
         */
        setError: function(target, error) {
            return this._callIfExists('setError', target, error);
        },

        /**
         * set an error on a given row
         * @param {number|Object} target - the target row to add an error to
         */
        clearError: function(target) {
            return this._callIfExists('clearError', target);
        },

        /**
         * set an error on a given row
         * @param {Object} errors - the targets row to add an error to
         */
        setErrors: function(errors) {
            return this._callIfExists('setErrors', errors);
        },

        /**
         * Clear the errors off the given targets, or all of the rows
         * @param {Object} errors
         */
        clearErrors: function(errors) {
            return this._callIfExists('clearErrors', errors);
        },

        /**
         * Rerender the given row without rendering the entire table again
         * @param {Object} target the target row
         * @param {Object} [options]
         */
        reRenderRow: function(target, options) {
            return this._callIfExists('reRenderRow', target, options);
        },

        /**
         * clear the currently selected nodes, turning off batch mode
         */
        clearSelection: function() {
            this._callIfExists('clearSelection');
        },

        /**
         * Deselect a row or range of rows.
         * Rows can be indicated by the same values accepted by {@link HATable#row}
         * @param {number|Object|HTMLElement|Event} startingRow Row (or first row in sequence) to deselect
         * @param {number|Object|HTMLElement|Event} [endingRow] Final row in sequence to deselect
         */
        deselect: function(startingRow, endingRow) {
            this._callIfExists('deselect', startingRow, endingRow);
        },

        /**
         * Select a row or range of rows.
         * Rows can be indicated by the same values accepted by {@link HATable#row}
         * @param {number|Object|HTMLElement|Event} startingRow Row (or first row in sequence) to select
         * @param {number|Object|HTMLElement|Event} [endingRow] Final row in sequence to select
         */
        select: function(startingRow, endingRow) {
            if (this.allowBatchMode) {
                this._callIfExists('select', startingRow, endingRow);
            }
        },

        /**
         * Selects all rows.
         * Note that only rows that have actually been loaded will be represented in the selection object.
         */
        selectAll: function() {
            if (this.allowBatchMode) {
                this._callIfExists('selectAll');
            }
        },

        /**
         * Update the state of the table
         */
        refresh: function() {
            this._callIfExists('refresh');
            this._refreshTableBar();
        },

        /**
         * Resize the table, adjusting to fit the space allotted to it
         */
        resize: function() {
            return this._callIfExists('resize');
        },

        /**
         * Resizes the width of the column with id columnId to be width pixels wide.
         * @param {number|string} columnId
         * @param {number} width
         */
        resizeColumnWidth: function(columnId, width) {
            return this._callIfExists('resizeColumnWidth', columnId, width);
        },

        /**
         * Update the state of the tablebar
         * @private
         */
        _refreshTableBar: function() {
            var specificEdit = this.editMode && this.editMode === 'specific';

            if (!this.showTableBar || !this.hasToolbarContent) {
                this._toolbarNode.classList.add('hidden');
            } else {
                this._toolbarNode.classList.remove('hidden');

                if (this.showSettings) {
                    this._settingsIconButton.classList.remove('hidden');
                    this._updateColumnHider();
                    this._loadSettings();
                } else {
                    this._settingsIconButton.classList.add('hidden');
                }

                if (this.showExport && this._total) {
                    this._exportIconButton.classList.remove('hidden');
                } else {
                    this._exportIconButton.classList.add('hidden');
                }

                if (this.showEditMode && this._total) {
                    if (specificEdit) {
                        this._changeSpecificEdit();
                    } else {
                        this._editIconButton.classList.remove('hidden');
                    }
                } else {
                    if (specificEdit) {
                        this._changeSpecificEdit(true);
                    } else {
                        this._editIconButton.classList.add('hidden');
                    }
                }

                if (this.showPrintList && this._total) {
                    this._printIconButton.classList.remove('hidden');
                } else {
                    this._printIconButton.classList.add('hidden');
                }
            }
        },

        /**
         * Load table settings from localStorage
         * Requires that the table have the 'userId' and 'persistentId' properties set
         * Persisted settings:
         * * compact mode
         * * rowsPerPage
         * * hidden columns
         * @private
         */
        _loadSettings: function() {
            if (!this.showSettings) {
                return;
            }

            var settingsKey,
                settings,
                rowsPerPageRadio = this._rowsPerPageGroup;

            this._loadingSettings = true;
            /* istanbul ignore else */
            if (rowsPerPageRadio) {
                rowsPerPageRadio.value = this.rowsPerPage;
            }

            if (this.userId && this.persistentId && window.localStorage) {
                settingsKey = 'table-' + this.userId + this.persistentId + '-settings';
                settings = JSON.parse(window.localStorage.getItem(settingsKey));

                if (!settings) {
                    this._loadingSettings = false;
                    return;
                }

                /* istanbul ignore else */
                if (settings.compact) {
                    this.compact = true;
                    this._compactCheckbox.checked = true;
                }

                /* istanbul ignore else */
                if (settings.rowsPerPage) {
                    this.rowsPerPage = settings.rowsPerPage;
                }

                /* istanbul ignore else */
                if (settings.columns) {
                    Object.keys(this.table.columns).forEach(function(columnId) {
                        var column = this.table.columns[columnId];

                        /* istanbul ignore else */
                        if (settings.columns[column.field]) {
                            if (settings.columns[column.field].hidden) {
                                column.hidden = true;
                                this.table._updateColumnHiddenState(column.id, true);
                            }

                            if (settings.columns[column.field].unhidable) {
                                column.unhidable = true;
                            }
                        }
                    }, this);

                    this._updateColumnHider();
                }
            }
            this._loadingSettings = false;
        },

        /**
         * Save table settings to localStorage
         * Requires that the table have the 'userId' and 'persistentId' properties set
         * Persisted settings:
         * * compact mode
         * * rowsPerPage
         * * hidden columns
         * @private
         */
        _saveSettings: function() {
            if (this._loadingSettings || !window.localStorage || !(this.userId && this.persistentId)) {
                // do not save settings if settings are being loaded
                return;
            }
            var settingsKey = 'table-' + this.userId + this.persistentId + '-settings',
                columns = this._get('columns'),
                settings = {
                    compact: this.compact,
                    rowsPerPage: this.rowsPerPage,
                    columns: {}
                };

            Object.keys(columns).forEach(function(columnId) {
                var column = columns[columnId];

                if (column.hidden) {
                    settings.columns[column.field] = {
                        hidden: true
                    };
                }

                if (column.unhidable) {
                    if (!settings.columns[column.field]) {
                        settings.columns[column.field] = {};
                    }

                    settings.columns[column.field].unhidable = true;
                }
            }, this);

            window.localStorage.setItem(settingsKey, JSON.stringify(settings));
        },

        /**
         * Get the available editable fields
         * This returns a list of fields where the column definition has a
         * editor propoerty defined
         * @return {String[]} - the list of available editable fields
         */
        getAvailableEditableFields: function() {
            return this._callIfExists('getAvailableEditableFields');
        },

        /**
         * An object with the row id as the property name and the value
         * is the changed fields with their new values
         * @type {Object}
         */
        get dirty() {
            return this._get('dirty');
        },

        get fields() {
            var columns = this.columns;
            return Array.isArray(columns) ? columns.map(function(column) {
                return column.field;
            }) : Object.keys(columns);
        },

        /**
         * Show all of the hidden columns
         */
        showAllHiddenColumns: function() {
            var columns = this.columns,
                fields = Array.isArray(columns) ? columns.map(function(column) {
                    return column.field;
                }) : Object.keys(columns);
            fields.forEach(function(field, index) {
                this._callIfExists('toggleColumnHiddenState', '' + index, false);
            }.bind(this));
        },

        _changeSpecificEdit: function(disable) {
            var table = this;

            function makeFieldEditable(event) {
                var field = event.target.selectedItem.value;

                table.editableFields = [field];
                table.editable = true;
            }

            if (disable) {
                if (this.editMenu) {
                    this._toolbarNode.removeChild(this.editMenu);
                    this.editMenu.removeEventListener(makeFieldEditable);
                }
                return;
            }

            if (!this.editMenu) {
                this.editMenu = document.createElement('ha-menu-button');
                this.editMenu.label = 'Edit Specific Field';
                this.editMenu.classList.add('specific-edit');
                this.editMenu.icon = 'hi-edit';
                this.editMenu.items = this.getAvailableEditableFields().map(function(field) {
                    var fieldItem = document.createElement('ha-item'),
                        label = table.columns[field].label;

                    fieldItem.label = label;
                    fieldItem.value = field;

                    return fieldItem;
                });

                this.editMenu.addEventListener('select', makeFieldEditable);

                this._editIconButton.parentNode.insertBefore(this.editMenu, this._editIconButton);
            }
        },

        /**
         * The callback for the click handler on the Edit button
         * This can do any of the mandatory operations that the edit button
         * handler needs to do and then call the public onClickEdit
         * @param {Event} event - the click event object
         * @private
         */
        _onClickEdit: function(event) {
            event.editableFields = this.editMode === 'custom' ? this.editableFields : this.getAvailableEditableFields();

            this.onClickEdit(event);
        },

        /**
         * @param {Event} event - the click event object
         * This method is meant to be overridden by the implementor of the table
         * as a way to provide custom edit functionality. By default, it simply
         * changes editable to true.
         */
        onClickEdit: function(event) {
            /*jshint unused:false*/
            this.editable = true;
        },

        /**
         * The method that is called when the cancel button is clicked in edit mode/
         * This method emits a 'edit-cancel` event, reverts the data, and sets editable to false.
         * Implementors of the table can listen for the `edit-cancel` event and add additional functionality.
         * Or, they can override this method directly to prevent the default funcitonality from occurring.
         */
        onEditCancel: function() {
            this.emit('edit-cancel');
            this.revert();
            this.editable = false;
        },

        /**
         * The method that is called when the save button is clicked in edit mode/
         * This method emits a 'edit-save` event.
         * Implementors of the table can listen for the `edit-save` event and add additional functionality.
         * Or, they can override this method directly to prevent the default funcitonality from occurring.
         */
        onEditSave: function() {
            this.emit('edit-save', {changed: this.dirty});
        },

        /**
         * Call save on the table, saving the changed/edited values back to the store instance.
         */
        save: function() {
            this._callIfExists('save');
        },

        /**
         * Revert the changes in the table
         */
        revert: function() {
            this._callIfExists('revert');
        },

        /**
         * Toggle the table into edit mode.
         * @param {Boolean} enabled - whether edit mode is enabled.
         */
        setEditModeEnabled: function(enabled) {
            this._defaultNode.classList[enabled ? 'add' : 'remove']('animate-hidden');
            this._defaultNode[enabled ? 'setAttribute' : 'removeAttribute']('aria-hidden', true);

            this._editNode.classList[enabled ? 'remove' : 'add']('animate-hidden');
            this._editNode[enabled ? 'removeAttribute' : 'setAttribute']('aria-hidden', true);
        },

        /**
         * Reset the configuration of the current renderer factory
         */
        updateFactorySettings: function() {
            if (this.rendererFactory) {
                this.rendererFactory.resetConfig(this.table);
            }
        },

        /**
         * Add built-in render modes
         */

        _addRenderModes: function() {
            this._rowEditingRenderer = new RowEditingRenderer();
            this.addRenderMode('rowEdit', this._rowEditingRenderer);

            this._rowExpansionTableRenderer = new RowExpansionRenderer({
                renderRowExpansionContent: function(row) {
                    var tableRow = this.row(row);

                    if (this._lastEditRow === tableRow.id) {
                        if (this._rowExpansionRenderer) {
                            if (!this._cachedRowExpansion) {
                                this._cachedRowExpansion = this._rowExpansionRenderer(tableRow.id, function() {
                                    this.cancelRowEdit();
                                }.bind(this));
                            }

                            return this._cachedRowExpansion;
                        } else {
                            return this._createMobileRowExpansion();
                        }
                    } else {
                        return this.ownerDocument.createElement('div');
                    }
                }.bind(this),
                manualActivation: true,
                expansionClassName: 'row-edit-expansion',
                useFocusIndicator: true,
                scrollingThreshold: 1,
                autoResizeTable: true,
                focusIndicatorLabel: this.rowEditCancelText
            });
            this.addRenderMode('rowEditExpansion', this._rowExpansionTableRenderer);

            this.addRenderMode('stackedRenderer', new StackedRenderer(), this._rowExpansionTableRenderer);
            this.addRenderMode('columnLockingRenderer', new ColumnLockingRenderer(), this._rowExpansionTableRenderer);

            if (deviceUtils.isHandheld()) {
                this.addRenderMode('default', new ResponsiveDefaultRenderer(), this._rowExpansionTableRenderer);
            }

            if (this.renderMode) {
                var oldMode = this.renderMode;
                this.renderMode = '';
                this.renderMode = oldMode;
            } else {
                this.renderMode = 'default';
            }
        },

        /**
         * Handler for the settings button being activated (clicked or enter/space)
         * Toggles the settings popover between hidden and shown
         * @private
         */
        _onClickSettings: function() {
            var settingsContainer = this._settingsPopover || this._settingsDrawer;

            if (settingsContainer.classList.contains('visible')) {
                settingsContainer.close();
            } else {
                if (deviceUtils.isMobile()) {
                    this._buildMobileSortOptions();
                    this._storeDefaultSettings();
                    this._backupSettings();
                }

                settingsContainer.show();
            }
        },

        /**
         * Get the form elements that are descendants of a node
         * @param {HTMLElement} node The container node
         * @returns {NodeList} A NodeList containing any form elements
         * @private
         */
        _getFormElements: function(node) {
            return node.querySelectorAll(FORM_ELEMENT_NAMES.join(','));
        },

        /**
         * Get the user-configurable table settings (as displayed when the 'Settings' icon is clicked)
         * @returns {object} An object whose keys are element names (or labels if no name exists) and values are the
         *      corresponding element's value (or the 'checked' property if it exists)
         * @private
         */
        _getSettings: function() {
            var settingsContainer = this._settingsDrawer || this._settingsPopover,
                formValues = {};

            Array.prototype.forEach.call(this._getFormElements(settingsContainer), function(formNode) {
                var name = formNode.name || formNode.label;

                /* istanbul ignore else */
                if (name) {
                    formValues[name] = 'checked' in formNode ? formNode.checked : formNode.value;
                }
            });

            return formValues;
        },

        /**
         * Create a one-time cache of the default user-configurable settings
         * @private
         */
        _storeDefaultSettings: function() {
            if (this._defaultSettings) {
                return;
            }

            this._defaultSettings = this._getSettings();
        },

        /**
         * Cache the current user-configurable settings
         * @private
         */
        _backupSettings: function() {
            this._backedupSettings = this._getSettings();
        },

        /**
         * Handler for the change event of the displayDensity radio buttons
         * Sets the 'compact' property and saves the table settings
         * @private
         */
        _onChangeDisplayDensity: function(event) {
            this.compact = event.target.checked;
            this.table.resize();
        },

        /**
         * Handler for change event of column hider checkboxes
         * Shows or hides the column and saves the table settings
         * @private
         */
        _onChangeEditColumn: function(event) {
            this.table._updateColumnHiddenState(event.target.value, !event.target.checked);
            this._saveSettings();
        },

        /**
         * Handler for change event of rowsPerPage checkbox
         * Sets the 'rowsPerPage' property and saves the table settings
         * @private
         */
        _onChangeRowsPerPage: function(event) {
            this.rowsPerPage = parseInt(event.target.value, 10);
            this._saveSettings();
        },

        /**
         * The callback for the click handler on the Print button
         * @protected
         */
        _onClickPrint: function() {
            var printWindow = window.open();

            this._renderPrintPage(printWindow);
        },

        /**
         * Render a table for printing, then copy it to the print window and open the print dialog
         * @protected
         */
        _renderPrintPage: function(printWindow) {
            var targetDoc = printWindow.document,
                printData = {
                    currentPath: window.location.href.substr(0, window.location.href.lastIndexOf('/')),
                    customCss: this.printListAdditionalCSSFile,
                    dgridCss: dgridCss,
                    printListTitleText: this.printListTitleText,
                    printListSubTitleText: this.printListSubTitleText,
                    printListFontFamily: this.printListFontFamily
                },
                table;

            if (printData.customCss) {
                if (printData.customCss.substr(0, 4).toLowerCase() !== 'http') {
                    printData.customCss = printData.currentPath + '/' + require.toUrl(printData.customCss);
                }

                printData.customCss = '<link rel="stylesheet" href="' + printData.customCss + '">';
            }

            require([
                './table-virtual'
            ], function() {
                // The table will resize to fit by setting the main content area's width if by default it is too large.
                // This is good when the table is being displayed in the same area where it's being resized, but in
                // the print case the table might end up being displayed in a significantly larger area than where it
                // was resized(since the table will be the only thing in the print window). In this case the inline
                // style on the content area still applies, as we're copying the table's innerHTML, but the content size
                // no longer matches the header size. In order to avoid this we build the table in a separate div.
                // The div needs to be large enough to not have the same problem and should be in flow for the table
                // to properly startup, but shouldn't be visible on the page. So it is absolutely positioned at
                // (-5000, -5000).
                var tableContainer = document.createElement('div');
                tableContainer.style.position = 'absolute';
                tableContainer.style.left = '-5000px';
                tableContainer.style.top = '-5000px';
                tableContainer.style.display = 'inline-block';
                tableContainer.style.width = '2000px';
                tableContainer.style.height = '20000px';

                table = this.ownerDocument.createElement('ha-table-virtual');
                table.print = true;
                table.allowBatchMode = false;
                table.compact = this.compact;

                table.showTableBar = false;
                table.columns = utils.clone(this.originalColumns, [this]);
                table.collection = this.collection;

                if (this.printRenderer) {
                    table.addRenderMode('print', this.printRenderer);
                    table.renderMode = 'print';
                }

                this.ownerDocument.body.appendChild(tableContainer);
                tableContainer.appendChild(table);
                // table.table.domNode.classList.add('dgrid-autoheight');
                table.table.minRowsPerPage = Infinity; // make sure we grab all of the rows
                table.autoheight = true;
                table.sort = this.sort;

                if (this.table._columnHiderRules) {
                    Object.keys(this.table._columnHiderRules).forEach(function(columnId) {
                        table.table._updateColumnHiddenState(columnId, true);
                    });
                }

                table.on('refresh-complete', function() {
                    if (table) {
                        table.table.bodyNode.style.marginTop = '';
                        printData.gridContent = table.table.domNode.innerHTML;
                        targetDoc.open();
                        targetDoc.write(printTemplate(printData));
                        targetDoc.close();
                        table.ownerDocument.body.removeChild(tableContainer);
                        table = null;
                    }
                });
            }.bind(this));
        },

        /**
         * @private
         * Render the settings table bar drawer
         */
        _renderSettingsDrawer: function() {
            var drawer = this.ownerDocument.createElement('ha-drawer-large'),
                contentNode = this.ownerDocument.createElement('div'),
                applyButton = this.ownerDocument.createElement('button'),
                resetButton = this.ownerDocument.createElement('button'),
                editColumnsNodeText,
                editColumnsNode;

            drawer.classList.add('table-settings');
            drawer.backdrop = true;
            drawer.titleText = this.settingsTitleText;
            drawer.footer = this.ownerDocument.createElement('div');
            drawer.footer[0].style.position = 'relative';
            applyButton.className = 'ha-button ha-button-primary';
            applyButton.textContent = this.settingsApplyButtonLabel;
            drawer.footer[0].appendChild(applyButton);
            resetButton.className = 'ha-button ha-button-secondary';
            resetButton.textContent = this.settingsResetButtonLabel;
            drawer.footer[0].appendChild(resetButton);

            this._sortNode = this.ownerDocument.createElement('div');
            this._sortNode.classList.add('mobile-sort-options');
            this._sortNode.appendChild(this.ownerDocument.createElement('h4'));
            this._sortNode.lastChild.textContent = this.mobileSortingText;
            this._sortOptionsNode = this.ownerDocument.createElement('div');
            this._sortNode.appendChild(this._sortOptionsNode);
            this._sortNode.appendChild(this.ownerDocument.createElement('div'));
            this._sortNode.lastChild.textContent = '.';
            this._sortNode.lastChild.classList.add('clearfix');
            contentNode.appendChild(this._sortNode);

            this._columnHiderNode = this.ownerDocument.createElement('div');
            this._columnHiderNode.classList.add('column-hider');
            editColumnsNodeText = this.ownerDocument.createElement('h4');
            editColumnsNodeText.textContent = this.editColumnsText;

            editColumnsNode = this.ownerDocument.createElement('div');
            editColumnsNode.className = 'edit-columns';

            this._columnHiderNode.appendChild(editColumnsNodeText);
            this._columnHiderNode.appendChild(editColumnsNode);
            contentNode.appendChild(this._columnHiderNode);

            this._displayDensityNode = this.ownerDocument.createElement('div');
            this._displayDensityNode.classList.add('display-density');
            this._displayDensityNode.appendChild(this.ownerDocument.createElement('h4'));
            this._displayDensityNode.lastChild.textContent = this.displayDensityText;
            this._compactCheckbox = this.ownerDocument.createElement('ha-checkbox');
            this._compactCheckbox.name = 'compactCheckbox';
            this._compactCheckbox.label = this.compactText;
            this._displayDensityNode.appendChild(this._compactCheckbox);
            contentNode.appendChild(this._displayDensityNode);

            this.otherSettingsNode = this.ownerDocument.createElement('div');
            this.otherSettingsNode.className = 'custom';
            contentNode.appendChild(this.otherSettingsNode);

            this._rowsPerPageNode = this.ownerDocument.createElement('div');
            this._rowsPerPageNode.classList.add('rows-per-page');
            this._rowsPerPageNode.appendChild(this.ownerDocument.createElement('h4'));
            this._rowsPerPageNode.lastChild.textContent = this.rowsPerPageText;
            this._rowsPerPageGroup = this.ownerDocument.createElement('ha-radio-button-group');
            this._rowsPerPageGroup.name = 'rowsPerPage';
            this._rowsPerPageGroup.radios = ['50', '150', '300'].map(function(count) {
                var radioButton = this.ownerDocument.createElement('ha-radio-button');

                radioButton.label = count;
                radioButton.value = count;

                return radioButton;
            }.bind(this));
            this._rowsPerPageNode.appendChild(this._rowsPerPageGroup);

            if (this._shouldShowPaginationSettings()) {
                contentNode.appendChild(this._rowsPerPageNode);
            }

            this.listenTo(applyButton, 'click', function() {
                this._applySettings();
                this._settingsDrawer.close();
            }.bind(this));

            this.listenTo(resetButton, 'click', function() {
                this._resetSettings();
            }.bind(this));

            drawer.section = contentNode;

            return drawer;
        },

        /**
         * @private
         * Apply all of the settings configuration found in the settings popover
         */
        _applySettings: function() {
            Array.prototype.forEach.call(this._columnHiderNode.querySelectorAll('ha-checkbox'), function(formNode) {
                var name = formNode.name || formNode.label;

                /* istanbul ignore else */
                if (formNode.checked !== this._backedupSettings[name]) {
                    this._onChangeEditColumn({
                        target: formNode
                    });
                }
            }.bind(this));

            /* istanbul ignore else */
            if (this._compactCheckbox.checked !== this._backedupSettings[this._compactCheckbox.name]) {
                this._onChangeDisplayDensity({
                    target: this._compactCheckbox
                });
            }

            if (this._shouldShowPaginationSettings()) {
                /* istanbul ignore else */
                if (this._rowsPerPageGroup.value !== this._backedupSettings[this._rowsPerPageGroup.name]) {
                    this._onChangeRowsPerPage({
                        target: this._rowsPerPageGroup
                    });
                }
            }

            var sortField, sortDescending;
            Array.prototype.forEach.call(this._sortNode.querySelectorAll('ha-radio-button'), function(radioButton) {
                if (radioButton.name === 'sort' && radioButton.checked) {
                    sortField = radioButton.value;
                } else if (radioButton.name === 'sortDir' && radioButton.checked) {
                    sortDescending = radioButton.value === 'desc';
                }
            });

            if (sortField !== undefined) {
                this.table.set('sort', [{
                    property: sortField,
                    descending: (sortDescending === undefined ? false : sortDescending)
                }]);
            } else {
                this.table.set('sort', []);
            }
        },

        /**
         * @private
         * Reset settings to the default values
         */
        _resetSettings: function() {
            var fieldName,
                formNode;

            for (fieldName in this._defaultSettings) {
                formNode = this._settingsDrawer.querySelector('[name="' + fieldName + '"]');

                if (!formNode) {
                    formNode = this._settingsDrawer.querySelector('[label="' + fieldName + '"]');
                }

                if (formNode) {
                    if ('checked' in formNode) {
                        formNode.checked = this._defaultSettings[fieldName];
                    } else {
                        if (formNode.tagName === 'HA-RADIO-BUTTON-GROUP' && !this._defaultSettings[fieldName]) {
                            // special case to uncheck all radio buttons
                            Array.prototype.forEach.call(formNode.querySelectorAll('ha-radio-button'), function(radio) {
                                radio.checked = false;
                            });
                        } else {
                            formNode.value = this._defaultSettings[fieldName];
                        }
                    }
                }
            }
        },

        _shouldShowPaginationSettings: function() {
            return true;
        },

        /**
         * callback method that is called when the 'Export' button on the tablebar is pressed
         * @param {Event} event - the the click event object
         * @private
         */
        _onClickExport: function(event) {
            event.table = this;
            this.emit('export', event);
        },

        /**
         * Called when user starts selecting or deselecting rows
         * If one or more rows are selected, batch mode is active and the batch mode bar is displayed
         * If no rows are selected, batch mode is inactive (but may still be enabled), and the batch mode bar is hidden
         * @param {boolean} isActive - whether batch mode is now active
         * @private
         */
        setBatchModeActive: function(isActive) {
            if (isActive) {
                this._defaultNode.classList.add('animate-hidden');
                this._defaultNode.setAttribute('aria-hidden', true);

                this._batchBarNode.classList.remove('animate-hidden');
                this._batchBarNode.removeAttribute('aria-hidden');
            } else {
                this._defaultNode.removeAttribute('aria-hidden');
                this._defaultNode.classList.remove('animate-hidden');

                this._batchBarNode.setAttribute('aria-hidden', true);
                this._batchBarNode.classList.add('animate-hidden');
            }

            this._set('batchModeActive', isActive);
        },

        /**
         * Update the column list in the columnHider section of the settings popover
         * @private
         */
        _updateColumnHider: function() {
            if (!this.showSettings || !this.showColumnHider) {
                return;
            }

            var container = this._columnHiderNode.querySelector('.edit-columns'),
                checkbox,
                columns = Object.keys(this.table.columns),
                columnCount = deviceUtils.isMobile() ? 1 : Math.ceil(columns.length / 10),
                hasColumns = false;

            container.innerHTML = '';

            /* istanbul ignore else */
            if ('WebkitColumnCount' in this.ownerDocument.documentElement.style) {
                container.style.WebkitColumnCount = columnCount;
            } else if ('MozColumnCount' in this.ownerDocument.documentElement.style) {
                container.style.MozColumnCount = columnCount;
            }

            container.style.columnCount = columnCount;

            columns.forEach(function(columnId) {
                var column = this.table.columns[columnId];

                if (!column.unhidable) {
                    if (column.hidden) {
                        this.table._hideColumn(column.id);
                    }

                    hasColumns = true;
                    checkbox = this.ownerDocument.createElement('ha-checkbox');
                    checkbox.label = column.label;
                    checkbox.value = column.id;
                    checkbox.name = 'hide-' + column.id;
                    if ('hidden' in column) {
                        checkbox.checked = !column.hidden;
                    } else {
                        checkbox.checked = true;
                    }
                    container.appendChild(checkbox);
                }
            }, this);

            if (hasColumns) {
                this._columnHiderNode.classList.remove('hidden');
            } else {
                this._columnHiderNode.classList.add('hidden');
            }
        },

        /**
         * @private
         * @param {HAPopover} popover the popover to convert to a drawer
         * Convert the provided popover to a drawer for responsive
         */
        _buildDrawerFromPopover: function(popover) {
            if (popover._convertedDrawer) {
                return popover._convertedDrawer;
            }

            var drawer = this.ownerDocument.createElement('ha-drawer-large'),
                section = this.ownerDocument.createElement('section'),
                footer = this.ownerDocument.createElement('footer'),
                popoverForm = popover.querySelector('ha-popover-form'),
                button;

            function appendAllNodes(dst, src) {
                if (src) {
                    if ('length' in src) {
                        // it's a list of nodes
                        Array.prototype.slice.call(src).forEach(function(node) {
                            dst.appendChild(node);
                        });
                    } else {
                        dst.appendChild(src);
                    }
                }
            }

            if (popoverForm) {
                appendAllNodes(section, popoverForm.section);
                appendAllNodes(footer, popoverForm.footer);
            } else {
                appendAllNodes(section, popover.children);
            }

            // we want buttons
            ['.ha-button-primary', '.ha-button-secondary'].forEach(function(btnClass) {
                if (footer.querySelector(btnClass) === null) {
                    [popover, section].forEach(function(source) {
                        button = source.querySelector(btnClass);
                        if (button) {
                            footer.appendChild(button);

                            button.addEventListener('click', function() {
                                drawer.close();
                            });
                        }
                    });
                }
            });

            drawer.backdrop = true;
            drawer.classList.add('two-button');
            drawer.titleText = 'Filters';

            if (section) {
                drawer.section = section;
            }

            if (footer) {
                drawer.footer = footer;
            }

            popover._convertedDrawer = drawer;

            return drawer;
        },

        /**
         * @private
         * @param {Event} clickEvent
         * Callback which determines whether a row should be made editable
         */
        _shouldEditRow: function(clickEvent) {
            var select = true;
            if (clickEvent && clickEvent.target) {
                if (clickEvent.target.tagName === 'HA-CHECKBOX' || clickEvent.target.tagName === 'HA-RADIO-BUTTON' ||
                    clickEvent.target.tagName === 'INPUT' || clickEvent.target.tagName === 'BUTTON' ||
                    clickEvent.target.tagName === 'A') {
                    select = false;
                }
            }

            return select;
        },

        set rowExpansion(value) {
            if (this.allowRowEditing) {
                this.cancelRowEdit();
            }

            this._rowExpansion = value;

            if (this.allowRowEditing) {
                this._prepareRowEditor();
            }
        },

        /**
         * @type {boolean}
         * Whether or not to provide row expansion functionality for mobile row
         * editing. If false, a row-edit event is emitted instead
         */
        get rowExpansion() {
            return this._rowExpansion;
        },

        set rowExpansionRenderer(value) {
            if (this.allowRowEditing) {
                this.cancelRowEdit();
            }

            this._rowExpansionRenderer = value;
        },

        /**
         * @type {function}
         * A function that provides a DOM node to mobile row editing
         */
        get rowExpansionRenderer() {
            return this._rowExpansionRenderer;
        },

        /**
         * @private
         * Enables editing in the table
         */
        _enableRowEditing: function() {
            this._callIfExists('_togglePaginationButtons', false);

            this._lastEditRow = null;

            this._rowFocusEventHandle = function(event) {
                if (!this._shouldEditRow(event)) {
                    return;
                }

                var cell = this.cell(event), row = cell ? cell.row : null;

                if (!row || !cell) {
                    return;
                }

                if (this._lastEditRow !== null) {
                    return;
                }

                event.stopPropagation();
                event.preventDefault();

                this._lastEditRow = row.id;

                this._showRowEditor(row.id);
            }.bind(this);

            this._rowEditOldSelectionMode = this.selectionMode;
            this.selectionMode = 'none';

            this.on('click', this._rowFocusEventHandle);

            this._prepareRowEditor();

            this._storeUpdateHandle = this.table.collection.on('add, delete', function() {
                this.cancelRowEdit();
            }.bind(this));
        },

        /**
         * @private
         * Enables editing in the table
         */
        _disableRowEditing: function() {
            this._callIfExists('_togglePaginationButtons', true);

            this.cancelRowEdit();

            this.selectionMode = this._rowEditOldSelectionMode;

            if (this._rowFocusEventHandle) {
                this.off('click', this._rowFocusEventHandle);
                this._rowFocusEventHandle = null;
            }

            if (this._storeUpdateHandle) {
                this._storeUpdateHandle.remove();
                this._storeUpdateHandle = null;
            }
        },

        /**
         * Validate information in an editable row
         * @param {function} validate - a function to call to validate the data,,
         */
        rowEditValidator: function(validate) {
            validate();
        },

        rowEditSaveHandler: function() {
            var dirtyFields = {}, isValid = true, rowData = Object.create(this._rowEditData);

            Object.keys(this._rowEditFields).forEach(function(fieldName) {
                var field = this._rowEditFields[fieldName];

                if (field.getValue) {
                    if ('checkValidity' in field.editor) {
                        if (!field.editor.checkValidity()) {
                            isValid = false;
                        }
                    }

                    var currentValue = field.getValue();

                    if (currentValue !== field.originalValue) {
                        dirtyFields[fieldName] = currentValue;
                        rowData[fieldName] = currentValue;
                    }
                }
            }.bind(this));

            if (isValid) {
                if (Object.keys(dirtyFields).length > 0) {
                    var validateData = {};
                    validateData[this._lastEditRow] = dirtyFields;

                    this.rowEditValidator(function() {
                        if (this._lastEditRow !== null) {
                            this.table.collection.get(this._lastEditRow).then(function(storeRow) {
                                var isNewRow = storeRow === undefined;

                                if (isNewRow) {
                                    this.table.collection.add(rowData);
                                    this.refresh();
                                } else {
                                    Object.keys(dirtyFields).forEach(function(field) {
                                        this.table.updateDirty(this._lastEditRow, field, dirtyFields[field]);
                                    }.bind(this));

                                    this.save();
                                }

                                this._rowEditDeleteOnCancel = false;
                                this.cancelRowEdit();
                            }.bind(this));

                        }
                    }.bind(this), validateData, this);
                } else {
                    this.rowEditCancelHandler();
                }
            }
        },

        rowEditCancelHandler: function() {
            this.cancelRowEdit();
        },

        /**
         * Cancel any currently active row editing operation. If no row edit is
         * in progress, this method does nothing
         */
        cancelRowEdit: function() {
            if (this._lastEditRow !== null) {
                this._cachedRowExpansion = null;

                var editRow = this._lastEditRow;
                this._lastEditRow = null;
                this._rowEditFields = null;
                this._hideRowEditor(editRow);

                if (this._rowEditDeleteOnCancel) {
                    this.table.collection.remove(editRow);
                }
            }
        },

        rowEditChangeHandler: function(editors) {
            // get a list of all the editors
            this.emit('row-edit-update', {
                editors: editors
            });
        },

        _showRowEditor: function(rowId, rowData) {
            var row = this.row(rowId);

            if (row && !rowData) {
                rowData = row.data;
            }

            this._rowEditData = rowData;
            this._rowEditFields = this._createFieldEditors(rowData);

            this._rowEditDeleteOnCancel = false;

            if (deviceUtils.isDesktop()) {
                this._rowEditingRenderer.setEditableRow(this, rowId, this._rowEditFields);
            } else if (deviceUtils.isHandheld()) {
                if (this._rowExpansion) {
                    this.reRenderRow(rowId);

                    var rowElement = this.row(rowId).element;

                    this._rowExpansionTableRenderer._toggleRowExpansion(rowElement, false, rowElement);

                    a11y.setFocusOnAnyFirst(rowElement.querySelector('.ha-table-row-expansion'));

                    this._rowExpansionBlurEventHandle = function(event) {
                        var newElement = this.row(rowId).element,
                            tableElement = newElement.querySelector('table'),
                            node = event.target,
                            isOnTableRow = false,
                            isOnAnyRow = false,
                            isInRowMeat = false;

                        while (node && node !== document) {
                            if (node === newElement) {
                                isInRowMeat = true;
                            } else if (node === tableElement) {
                                isOnTableRow = true;
                            } else if (node.classList.contains('dgrid-row')) {
                                isOnAnyRow = true;
                            }

                            node = node.parentNode;
                        }

                        if (isOnTableRow) {
                            // we wrap this one in a timeout so the editor doesn't reappear on the same row
                            setTimeout(function() {
                                this.rowEditCancelHandler();
                            }.bind(this), 0);
                        } else if (isOnAnyRow && !isInRowMeat) {
                            this.rowEditCancelHandler();
                        }
                    }.bind(this);
                    document.body.addEventListener('mouseup', this._rowExpansionBlurEventHandle);
                } else {
                    this.emit('row-edit', {
                        row: rowId
                    });
                    this.cancelRowEdit();
                }
            }
        },

        _prepareRowEditor: function() {
            if (deviceUtils.isDesktop()) {
                this.renderMode = 'rowEdit';
            }
        },

        _hideRowEditor: function(rowId) {
            if (this.allowRowEditing) {
                if (deviceUtils.isDesktop()) {
                    this._rowEditingRenderer.setEditableRow(this, null, null);
                } else if (deviceUtils.isHandheld()) {
                    if (this._rowExpansion) {
                        var element = this.row(rowId).element;
                        this._rowExpansionTableRenderer._toggleRowExpansion(element, true, element);

                        if (this._rowExpansionBlurEventHandle) {
                            document.body.removeEventListener('mouseup', this._rowExpansionBlurEventHandle);
                            this._rowExpansionBlurEventHandle = null;
                        }
                    }
                }
            }
        },

        _putEditorsIntoRows: function(fields) {
            var allFields = [];

            Object.keys(fields).forEach(function(fieldName) {
                var field = fields[fieldName];
                allFields.push(field);
            }.bind(this));

            var rows = [];

            while (allFields.length) {
                var rowFields = [allFields.shift()],
                    weight = rowFields[0].column.drawerWeight || 1;

                while (allFields.length && weight + (allFields[0].column.drawerWeight || 1) <= 1) {
                    var field = allFields.shift();
                    rowFields.push(field);
                    weight += field.column.drawerWeight || 1;
                }

                rows.push(rowFields);
            }

            return rows;
        },

        _createMobileEditor: function(field) {
            var container = this.ownerDocument.createElement('div');
            container.style.width = Math.round((field.column.drawerWeight || 1) * 100) + '%';

            if (field.editor) {
                field.editor.label = field.column.label;
                container.appendChild(field.editor);
            } else {
                var textField = this.ownerDocument.createElement('ha-text-field');
                textField.label = field.column.label;
                textField.disabled = true;
                textField.value = field.displayValue;

                container.appendChild(textField);
            }

            return container;
        },

        _createMobileRowExpansion: function() {
            var container = this.ownerDocument.createElement('div'),
                content = this.ownerDocument.createElement('section'),
                footer = this.ownerDocument.createElement('footer'),
                fields = this._rowEditFields,
                header = this.ownerDocument.createElement('header');

            if (this.rowEditTitle) {
                var title = this.ownerDocument.createElement('h4');
                title.textContent = this.rowEditTitle;

                header.appendChild(title);
            }

            content.appendChild(header);

            this._putEditorsIntoRows(fields).forEach(function(row) {
                var rowContainer = document.createElement('div');
                rowContainer.className = 'row';

                row.forEach(function(field) {
                    rowContainer.appendChild(this._createMobileEditor(field));
                }.bind(this));

                content.appendChild(rowContainer);
            }.bind(this));

            var saveButton = this.ownerDocument.createElement('button');
            saveButton.className = 'ha-button ha-button-primary';
            saveButton.textContent = this.rowEditSaveText;
            saveButton.addEventListener('click', function() {
                this.rowEditSaveHandler();
            }.bind(this));

            footer.appendChild(saveButton);

            container.appendChild(content);
            container.appendChild(footer);

            return container;
        },

        _createFieldEditors: function(data) {
            var fieldEditors = {},
                columns = this.columns;

            function createSetter(column, editor) {
                var editorPropertyName = 'value';

                if (column && column.editorArgs && column.editorArgs.value) {
                    editorPropertyName = column.editorArgs.value;
                }

                return function(value) {
                    editor[editorPropertyName] = value;
                };
            }

            function createGetter(column, editor) {
                var editorPropertyName = 'value';

                if (column && column.editorArgs && column.editorArgs.value) {
                    editorPropertyName = column.editorArgs.value;
                }

                return function() {
                    return editor[editorPropertyName];
                };
            }

            function onChangeHandler() {
                var editors = {};

                Object.keys(fieldEditors).forEach(function(fieldName) {
                    if (fieldEditors[fieldName].editor) {
                        editors[fieldName] = fieldEditors[fieldName].editor;
                    }
                });

                this.rowEditChangeHandler(editors);
            }

            Object.keys(columns).forEach(function(field) {
                var column = columns[field], tableField = {};

                if (column.hidden) {
                    return;
                }

                tableField.column = column;
                tableField.value = data[column.field];

                if (column.formatter) {
                    var formatter = column.formatter,
                        formatterScope = this.table.formatterScope;

                    tableField.displayValue = typeof formatter === 'string' && formatterScope ?
                        formatterScope[formatter](tableField.value, data) : formatter(tableField.value, data);
                } else {
                    tableField.displayValue = tableField.value;
                }

                if (column.editor) {
                    var editor = document.createElement(column.editor);

                    tableField.editor = editor;

                    if (column.editorInit) {
                        column.editorInit(editor, tableField.value, column);
                    }

                    tableField.setValue = createSetter(column, editor);
                    tableField.setValue(tableField.value);
                    tableField.getValue = createGetter(column, editor);
                    tableField.originalValue = tableField.getValue();

                    editor.addEventListener('change', onChangeHandler.bind(this));
                }

                fieldEditors[field] = tableField;
            }.bind(this));

            return fieldEditors;
        },

        /**
         * Add one empty row to the bottom of the table, and if row editing is enabled,
         * edit it
         */
        addAndEditRow: function() {
            if (this.allowRowEditing) {
                var rowId;

                if (this._lastEditRow) {
                    this.cancelRowEdit();
                }

                if (deviceUtils.isDesktop()) {
                    rowId = this.addEmptyRows(1);
                    this._lastEditRow = rowId;
                    this._showRowEditor(rowId);
                } else if (deviceUtils.isHandheld()) {
                    rowId = this.addEmptyRows(1);
                    this._lastEditRow = rowId;
                    this._showRowEditor(rowId);
                    if (!this._rowExpansionRenderer) {
                        this._rowEditDeleteOnCancel = true;
                    }
                }
            } else {
                this.addEmptyRows(1);
            }
        },

        _createEmptyRow: function() {
            var rowTemplate = {};

            Object.keys(this.columns).forEach(function(field) {
                if (field !== 'id') {
                    rowTemplate[field] = '';
                }
            }.bind(this));

            var maxId = 0;

            this.table.collection.data.forEach(function(datum) {
                if (datum.id) {
                    maxId = Math.max(datum.id, maxId);
                }
            }.bind(this));

            rowTemplate.id = maxId + 1;

            return rowTemplate;
        },

        /**
         * Add empty rows to the bottom of the table
         * @param {Number} rowCount the number of rows to add
         */
        addEmptyRows: function(rowCount) {
            rowCount = Math.max(0, rowCount || 1);

            var lastId = null;

            while (rowCount--) {
                var record = this._createEmptyRow();
                lastId = record.id;

                this.table.collection.add(record);
            }

            this.refresh();

            return lastId;
        },

        _getSortOptions: function() {
            var columns = this.table ? this.table.get('_columns') : [],
                sortableColumns = [],
                currentSort = this.table ? this.table.get('sort')[0] : undefined,
                isSorted = false,
                sortDescending;

            columns.forEach(function(column) {
                if (column.sortable !== false) {
                    var def = {
                        column: column,
                        field: column.field,
                        label: column.label || column.field
                    };

                    if (currentSort !== undefined && currentSort.property === column.field) {
                        def.sorted = true;
                        def.descending = currentSort.descending;

                        isSorted = true;
                        sortDescending = currentSort.descending;
                    }

                    sortableColumns.push(def);
                }
            });

            // If nothing was sorted, sort the first column by default
            if (!isSorted && sortableColumns.length > 0) {
                sortableColumns[0].sorted = true;
                sortableColumns[0].descending = false;
                sortDescending = false;
            }

            return {
                options: sortableColumns,
                sortDescending: sortDescending
            };
        },

        _buildMobileSortOptions: function() {
            var doc = this.ownerDocument,
                root = this._sortOptionsNode,
                sortOptions = this._getSortOptions(),
                options = sortOptions.options,
                sortDescending = sortOptions.sortDescending,
                option, group, radios;

            root.innerHTML = '';

            if (options.length > 0 && this.showMobileSortOptions) {
                this._sortNode.style.display = 'block';

                group = doc.createElement('ha-radio-button-group');
                group.name = 'sort';

                radios = [];

                options.forEach(function(sortOption) {
                    option = doc.createElement('ha-radio-button');
                    option.value = sortOption.field;
                    option.label = sortOption.label;
                    option.name = 'sort';

                    if (sortOption.sorted) {
                        option.checked = true;
                    }

                    radios.push(option);
                });

                group.radios = radios;

                root.appendChild(group);

                root.appendChild(doc.createElement('h4'));
                root.lastChild.textContent = this.mobileSortOrderText;

                group = doc.createElement('ha-radio-button-group');
                group.name = 'sortDir';

                radios = [];

                radios.push(doc.createElement('ha-radio-button'));
                radios[0].value = 'asc';
                radios[0].label = this.mobileSortAscendingText;
                radios[0].name = 'sortDir';
                radios[0].checked = !sortDescending;

                radios.push(doc.createElement('ha-radio-button'));
                radios[1].value = 'desc';
                radios[1].label = this.mobileSortDescendingText;
                radios[1].name = 'sortDir';
                radios[1].checked = sortDescending;

                group.radios = radios;

                root.appendChild(group);
            } else {
                this._sortNode.style.display = 'none';
            }
        }
    });

    return register('ha-table', HATable);
});

/**
 * @external dstore/Memory
 * @see https://github.com/SitePen/dstore/blob/master/docs/Store.md
 */

/**
 * @module
 * @class ContentGroupMemory
 * @extends dstore/Memory
 * The ContentGroupMemory returns appropriate rows and headers to display
 * for content grouping.
 *
 * This store is required whenever content grouping is enabled and a
 * memory store is needed. If a server store is needed, see ContentGroupRest
 */
define('hui/table/ContentGroupMemory',[
    'dojo/_base/declare',
    'dojo/Deferred',
    'dojo/when',
    'dstore/QueryResults',
    'dstore/Memory',
    'dstore/Tree'
], function(declare, Deferred, when, QueryResults, Memory, Tree) {

    /**
     * Creates a method that returns a promise from a synchronous method.
     * @param {String} method The name of the method to create an async version of.
     * @returns A new function that wraps the results of the specified function
     * in a promise.
     */
    function promised(method) {
        return function() {
            var deferred = new Deferred(),
                queryResults;
            try {
                deferred.resolve(this[method].apply(this, arguments));
            } catch (error) {
                deferred.reject(error);
            }

            // need to create a QueryResults and ensure the totalLength is
            // a promise.
            queryResults = new QueryResults(deferred.promise);
            queryResults.totalLength = when(queryResults.totalLength);
            return queryResults;
        };
    }

    /**
     * Extension of the memory and tree stores that allows for
     * virtual scrolling and pagination of data grouped into different
     * categories.
     */
    return declare([Memory, Tree], {
        /**
         * Holds the last passed array of expanded groups to track whether
         * or not the data needs to be resorted.
         * @type {Array}
         */
        _lastExpanded: null,

        /**
         * Flag indicating whether to let sorting determine the order of
         * groups. If true then the order of groups is determined by their
         * original order in the data and sorting only occurs among items
         * within groups. If false then items are still only sorted within
         * their groups, but the order of the groups themselves is also
         * determined by the sorted order of the contained items.
         * @type {Boolean}
         */
        _forceGroupOrder: false,

        /**
         * Sets the _forceGroupOrder flag
         * @param {Boolean} forceGroupOrder - The new value for _forceGroupOrder
         */
        forceGroupOrder: function(forceGroupOrder) {
            if (this._forceGroupOrder !== forceGroupOrder) {
                this._lastExpanded = null;
            }
            this._forceGroupOrder = forceGroupOrder;
        },

        /**
         * Returns the data indicated by the passed in query
         * @param {Object} kwArgs - An object specifying the start and end range to return,
         * as well as an array of the IDs of the categories that are expanded.
         * @returns {QueryResults} - A QueryResults object containing all the items within
         * the specified range of the list of expanded items and any content group headers
         * that fall within that range as well
         */
        fetchGroupRangeSync: function(kwArgs) {
            var data = this.data,
                start = kwArgs.start,
                end = kwArgs.end,
                originalEnd = end,
                virtual = kwArgs.virtual,
                expanded = kwArgs.expanded || [],
                queryLog,
                i,
                l,
                j,
                lastCategoryId = null,
                skippedGroups = this._forceGroupOrder ? [] : null,
                childrenLength,
                isExpandedUpdated = false,
                rootCollection = this._getRoots(),
                originalCount,
                isFiltered,
                self = this,
                sorted = false,
                startOffset = 0,
                queryResults;

            if (!this._lastExpanded) {
                isExpandedUpdated = true;
            } else if (this._lastExpanded.length !== expanded.length) {
                isExpandedUpdated = true;
            } else {
                for (i = 0; i < expanded.length; i++) {
                    if (this._lastExpanded[i] !== expanded[i]) {
                        isExpandedUpdated = true;
                    }
                }
            }

            if (!data || data._version !== this.storage.version || isExpandedUpdated) {
                // our data is absent or out-of-date, so we requery from the root
                // start with the root data
                data = this.storage.fullData;
                // Ids can be strings or numbers, but convert them all to strings
                // for easier comparisons using indexOf
                this._lastExpanded = expanded.map(function(item) {
                    return String(item);
                });

                data = data.filter(function(item) {
                    return rootCollection.indexOf(item) < 0;
                });

                queryLog = this.queryLog;
                // iterate through the query log, applying each querier
                for (i = 0, l = queryLog.length; i < l; i++) {
                    if (!queryLog[i].querier.isSort) {
                        isFiltered = true;
                    } else {
                        sorted = true;
                    }
                    data = queryLog[i].querier(data, rootCollection);
                }

                // If the data hasn't already been sorted
                // we need to sort the children so that they're grouped together based on their
                // parent
                if (!sorted) {
                    data = this._sortAndCombineChildCollections(this._getChildCollections(data, rootCollection));
                }

                // Get the total length before adding the group headers, because they shouldn't
                // count towards the length
                this.totalLength = data.length;

                i = 0;
                while (i < data.length) {
                    if (lastCategoryId === null || data[i].parent !== lastCategoryId) {
                        lastCategoryId = data[i].parent;
                        for (l = 0; l < rootCollection.length; l++) {
                            if (this.getIdentity(rootCollection[l]) === lastCategoryId) {
                                data.splice(i, 0, rootCollection.splice(l, 1)[0]);
                                if (skippedGroups) {
                                    for (j = 0; j < skippedGroups.length; j++) {
                                        data.splice(i, 0, skippedGroups[j]);
                                        i++;
                                    }
                                    skippedGroups = [];
                                }
                                i += 2;
                                break;
                            } else if (skippedGroups) {
                                // Add in reverse order so when we splice them in
                                // they'll end up in the correct order
                                skippedGroups.unshift(rootCollection.splice(l, 1)[0]);
                                l--;
                            }
                        }
                    } else {
                        i++;
                    }
                }

                // We need to filter out the collapsed children after inserting the roots, because
                // we want the order of the roots to be consistent, and the only way to do that is to either
                // sort on the entire dataset, or insert them in the appropriate place after sorting and before
                // removing the collapsed children. This still misses the edge case where all the children of
                // a category have been filtered out, but in that case just displaying it at the end is ok since
                // it won't expand to have any children anyway.
                data = data.filter(function(item) {
                    return self._lastExpanded.indexOf(String(item.parent)) >= 0 ||
                        typeof item.parent === 'undefined' ||
                        item.parent === null;
                });

                // store it, with the storage version stamp
                data._version = this.storage.version;
                this.data = data;
            } else {
                rootCollection = rootCollection.filter(function(root) {
                    return data.indexOf(root) < 0;
                });
            }
            // Start will only be greater than data.length if
            // last was hit when not all groups were expanded or this
            // was an invalid request. Either way it's better to send
            // back the last page of available data then an empty results set
            if (start >= data.length) {
                originalCount = end - start;
                start = Math.floor((data.length - 2) / originalCount) * originalCount;
                end = start + originalCount;
            }

            // Expand the range to include all the rows that it should that have been pushed out
            // by group headers rows
            for (i = 0; i < end && i < data.length; i++) {
                if (this.mayHaveChildren(data[i])) {
                    end++;

                    if (i < start && !virtual) {
                        start++;
                        startOffset++;
                    }
                }
            }
            data = data.slice(start, end);
            childrenLength = data.length;
            // Only show the categories on the same page if there are fewer children than tha maximum allowed
            // since we don't want to expand a category and have no children show up under it.
            // If this is the case, even though there is more data, we also need to disable the Next and Last pagination
            // buttons since there will be no data to display until a category is expanded.
            if (childrenLength < (end - start) || originalEnd >= this.totalLength) {
                if (rootCollection.length > 0 && !isFiltered) {
                    data = data.concat(rootCollection);
                }
                queryResults = new QueryResults(data, {totalLength: this.totalLength});
                queryResults.isLastPage = true;
            } else {
                queryResults = new QueryResults(data, {totalLength: this.totalLength});
            }
            if (originalCount) {
                queryResults.start = start - startOffset + 1;
            }
            return queryResults;
        },

        /**
         * Creates a function that will sort data based on the provided
         * parameters. This method creates a function that handles sorting
         * within content groups.
         * @param {Function | Array} sorted - A comparison function for items or
         * an array of objects that each contain the name of a property on the store items
         * to sort by and a boolean indicating whether to sort in descending or ascending
         * manner.
         * @returns {Function} - The sorting function to call on the data
         * @private
         */
        _createSortQuerier: function(sorted) {
            var self = this,
            sortQuerier = function(data, rootCollection) {
                var comparator = typeof sorted === 'function' ? sorted : function(a, b) {
                        var i,
                            comparison,
                            property,
                            descending,
                            aValue,
                            bValue;
                        for (i = 0; i < sorted.length; i++) {
                            if (typeof sorted[i] === 'function') {
                                comparison = sorted[i](a, b);
                            } else {
                                property = sorted[i].property;
                                descending = sorted[i].descending;
                                aValue = a.get ? a.get(property) : a[property];
                                bValue = b.get ? b.get(property) : b[property];

                                /* jshint ignore:start */
                                aValue != null && (aValue = aValue.valueOf());
                                bValue != null && (bValue = bValue.valueOf());

                                comparison = aValue === bValue
                                    ? 0
                                    : (!!descending === (aValue === null || aValue > bValue && bValue !== null) ? -1 : 1);
                                /* jshint ignore:end */
                            }

                            if (comparison !== 0) {
                                return comparison;
                            }
                        }
                        return 0;
                    },
                    childCollections = self._getChildCollections(data.slice(), rootCollection);
                data = self._sortAndCombineChildCollections(childCollections, comparator);

                return data;
            };
            sortQuerier.isSort = true;
            return sortQuerier;
        },

        /**
         * Sorts each of the passed in child collections using the provided
         * comparator, and then arranges the child collections in the appropriate
         * order based on the contained data. If the _forceGroupOrder flag is set
         * to true the second step is skipped
         * @param {Array} childCollections - The list of items for each content group
         * @param {Function} comparator - The comparator function used to sort the items
         * @returns {Array} A single array containing all of the items in the appropriate order
         * @private
         */
        _sortAndCombineChildCollections: function(childCollections, comparator) {
            var collectionComparator = function(a, b) {
                if (!a || !a[0]) {
                    if (!b || !b[0]) {
                        return 0;
                    } else {
                        return 1;
                    }
                } else if (!b || !b[0]) {
                    return -1;
                } else {
                    return comparator ? comparator(a[0], b[0]) : 0;
                }
            },
                i;

            if (comparator) {
                for (i = 0; i < childCollections.length; i++) {
                    childCollections[i].sort(comparator);
                }
            }
            if (!this._forceGroupOrder) {
                childCollections.sort(collectionComparator);
            }

            for (i = 1; i < childCollections.length; i++) {
                childCollections[0] = childCollections[0].concat(childCollections[i]);
            }

            return childCollections[0];
        },

        /**
         * Returns an array of arrays, where each array contains all of the
         * items belonging to a specific content group.
         * @param {Array} data - The entire collection from which to extract the
         * child collections
         * @param {Array} rootCollection - The roots, or parents, of the content
         * groups within the collection
         * @returns {Array} - An array containing arrays which each contain all
         * the items that are children of a single content group.
         * @private
         */
        _getChildCollections: function(data, rootCollection) {
            var childCollections = [],
                rootIdentity,
                i;

            for (i = 0; i < rootCollection.length; i++) {
                rootIdentity = this.getIdentity(rootCollection[i]);
                childCollections.push(data.filter(function(item) {
                    return item.parent === rootIdentity;
                }));
            }

            return childCollections;
        },

        /**
         * Returns a collection containing all of the parent elements
         * in the data.
         * @returns {Array} - An array containing the parent elements
         * @private
         */
        _getRoots: function() {
            return this.storage.fullData.filter(function(obj) {
                return obj.parent == null; //jshint ignore:line
            });
        },

        /**
         * Returns true if the passed in item might have children and
         * false if not.
         * @param {Object} object - The item to check for whether it may
         * have children
         * @returns {Boolean} - A flag indicating whether or not the item
         * might have children
         */
        mayHaveChildren: function(object) {
            return typeof object.parent === 'undefined' || object.parent === null;
        },

        /**
         * Wraps fetchGroupRangeSync so that it returns a promise
         * @returns {Promise} - A Promise containing the results of the query.
         */
        fetchGroupRange: promised('fetchGroupRangeSync')
    });
});

/**
 * @external dstore/Request
 * @see https://github.com/SitePen/dstore/blob/master/docs/Store.md
 */

/**
 * @module
 * @class ContentGroupRequest
 * @extends dstore/Request
 * The ContentGroupRequest returns appropriate rows and headers to display
 * for content grouping.
 *
 * This store is required whenever content grouping is enabled and a
 * server-backed store is needed. If a in-memory store is needed, see ContentGroupMemory
 */
define('hui/table/ContentGroupRequest',['dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/request',
        'dstore/Request',
        'dstore/QueryResults'
], function(declare, lang, request, Request, QueryResults) {
    return declare(Request, {

        /**
         * Flag indicating whether to let sorting determine the order of
         * groups. If true then the order of groups is determined by their
         * original order in the data and sorting only occurs among items
         * within groups. If false then items are still only sorted within
         * their groups, but the order of the groups themselves is also
         * determined by the sorted order of the contained items.
         * @type {Boolean}
         */
        _forceGroupOrder: false,

        /**
         * Sets the _forceGroupOrder flag
         * @param {Boolean} forceGroupOrder - The value to set the flag with
         */
        forceGroupOrder: function(forceGroupOrder) {
            this._forceGroupOrder = forceGroupOrder;
        },

        /**
         * Renders a query string based on the 'expanded' params, which
         * include the list of the IDs of content groups that are expanded,
         * and the forceGroupOrder flag.
         * @param {Array} expanded - The list of IDs of content groups that
         * have been expanded
         * @returns {string} - The rendered query string
         * @private
         */
        _renderExpandedParams: function(expanded) {
            var forceGroupOrderParam = expanded.length ?
                (this._forceGroupOrder ? '&forceGroupOrder=true' : '') :
                (this._forceGroupOrder ? 'forceGroupOrder=true': '');
            return expanded.map(function(itemId) {
                return 'expanded=' + itemId;
            }).join('&') + forceGroupOrderParam;
        },

        /**
         * Renders query parameters to request a specific range
         * of data, and also renders the 'expanded' params, which
         * indicate which content groups have been expanded and whether
         * to enforce the original order of content groups or allow
         * them to be sorted.
         * @returns {String} - A string containing 'start', 'end' 'forceGroupOrder', and
         * 'expanded' query parameters
         * @private
         */
        _renderRangeParams: function() {
            var expanded = arguments[2],
            queryParams = this.inherited(arguments),
                expandedQueryParams;

            expandedQueryParams = this._renderExpandedParams(expanded);
            if (expandedQueryParams) {
                queryParams = queryParams || [];
                queryParams.push(expandedQueryParams);
            }

            return queryParams;
        },

        /**
         * Renders the appropriate query string based on the provided
         * options and calls the server to request the items.
         * @param {Object} kwArgs - An object containing 'start', 'end',
         * and 'expanded' properties that
         * @returns {QueryResults} - A promise that resolves to the requested data,
         * and which has a totalLength property that is a promise that resolves to the
         * totalLength of the requested data.
         */
        fetchGroupRange: function(kwArgs) {
            var start = kwArgs.start,
                end = kwArgs.end,
                expanded = kwArgs.expanded || [],
                requestArgs = {},
                results,
                expandedQueryParams,
                queryResults;
            if (this.useRangeHeaders) {
                requestArgs.headers = this._renderRangeHeaders(start, end);
                expandedQueryParams = this._renderExpandedParams(expanded);
                if (expandedQueryParams) {
                    requestArgs.queryParams = [expandedQueryParams];
                }
            } else {
                requestArgs.queryParams = this._renderRangeParams(start, end, expanded);
            }

            results = this._request(requestArgs);
            queryResults = new QueryResults(results.data, {
                totalLength: results.total,
                response: results.response
            });

            if (queryResults.then) {
                queryResults.then(function(data) {
                    data.isLastPage = results.isLastPage;
                    data.start = results.start;
                });
            } else {
                queryResults.isLastPage = results.isLastPage;
                queryResults.start = results.start;
            }
            return queryResults;
        },

        /**
         * Returns true if the passed in item might have children and
         * false if not.
         * @param {Object} object - The item to check for whether it may
         * have children
         * @returns {Boolean} - A flag indicating whether or not the item
         * might have children
         */
        mayHaveChildren: function(object) {
            return typeof object.parent === 'undefined' || object.parent === null;
        },

        /**
         * Overrides Request's implementation so that isLastPage can be added to the return
         * object
         * @param {Object} kwArgs
         * @returns {{data: *, total: *, response: *, isLastPage: *}}
         * @private
         */
        _request: function(kwArgs) {
            kwArgs = kwArgs || {};

            // perform the actual query
            var headers = lang.delegate(this.headers, { Accept: this.accepts }),
                requestUrl,
                response,
                collection,
                parsedResponse;

            if ('headers' in kwArgs) {
                lang.mixin(headers, kwArgs.headers);
            }

            requestUrl = this._renderUrl(kwArgs.queryParams);

            response = request(requestUrl, {
                method: 'GET',
                headers: headers
            });
            collection = this;
            parsedResponse = response.then(function(response) {
                return collection.parse(response);
            });
            return {
                data: parsedResponse.then(function(data) {
                    // support items in the results
                    var results = data.items || data,
                        i,
                        l;
                    for (i = 0, l = results.length; i < l; i++) {
                        results[ i ] = collection._restore(results[ i ], true);
                    }
                    return results;
                }),
                total: parsedResponse.then(function(data) {
                    // check for a total property
                    var total = data.total;
                    if (total > -1) {
                        // if we have a valid positive number from the data,
                        // we can use that
                        return total;
                    }
                    // else use headers
                    return response.response.then(function(response) {
                        var range = response.getHeader('Content-Range');
                        return range && (range = range.match(/\/(.*)/)) && +range[ 1 ];
                    });
                }),
                response: response.response,
                isLastPage: parsedResponse.then(function(data) {
                    return data.isLastPage;
                }),
                start: parsedResponse.then(function(data) {
                    return data.start;
                })
            };
        }
    });
});

define('hui/table/RendererFactoryRegistry',[
    '../core/utils',
    'object-utils/classes',
    './rendererFactoryFactory'
], function(utils, classes, rendererFactoryFactory) {
    /**
     * @deprecated since 0.13.0 Use HA-TABLE#addRenderMode instead for adding render modes
     */
    var RendererFactoryRegistry = classes.extend(Object, {
        constructor: function(rendererClassesMap) {
            this.rendererClassesMap = rendererClassesMap || {};
            console.warn('DEPRECATION WARNING: The RendererFactoryRegistry is deprecated and should should not be used ' +
                'anymore. Use the Table#addRenderMode method instead to directly add a render mode to a table');
        },

        getRendererFactory: function() {
            var renderers = {},
                key;

            for (key in this.rendererClassesMap) {
                if (this.rendererClassesMap.hasOwnProperty(key)) {
                    renderers[key] = new this.rendererClassesMap[key]();
                }
            }

            return rendererFactoryFactory(renderers);
        },

        registerRenderer: function(name, RendererClass) {
            this.rendererClassesMap[name] = RendererClass;
        }
    });

    return RendererFactoryRegistry;
});

define('hui/table-virtual',[
    'register-component/v2/register',
    'object-utils/classes',
    './table',
    './table/TableBase',
    './core/keys'
], function(register, classes, HATable, TableBase, keys) {
    /**
     * @class HATableVirtual
     * @extends HATable
     */
    var HATableVirtual = classes.createObject(HATable.prototype, /** @lends HATableVirtual# */ {
        _createGrid: function() {
            var grid = TableBase.factory({
                table: this,
                virtual: true,
                columns: this._getColumns()
            }, this._gridNode);

            grid.addKeyHandler(keys.ESCAPE, this._escapeHandler.bind(this));

            return grid;
        },

        _escapeHandler: function() {
            var node = this._getNextFocusableSibling() || this.querySelector('.table-escape-node');
            node.focus();
        },

        _getNextFocusableSibling: function() {
            var node = this.nextElementSibling;

            while (node) {
                if (node.focus) {
                    node.focus();

                    if (this.ownerDocument.activeElement === node) {
                        return node;
                    }
                }

                node = node.nextElementSibling;
            }
        },

        _shouldShowPaginationSettings: function() {
            return false;
        }
    });

    return register('ha-table-virtual', HATableVirtual);
});

(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define('hui-react/table/PromiseManagerSingle',["exports", "dojo/Deferred"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require("dojo/Deferred"));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.Deferred);
        global.PromiseManagerSingle = mod.exports;
    }
})(this, function (exports, _Deferred) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _Deferred2 = _interopRequireDefault(_Deferred);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var PromiseManagerSingle = function () {

        // Constructor

        function PromiseManagerSingle() {
            _classCallCheck(this, PromiseManagerSingle);

            this.promise = null;
        }

        // Get a promise for the request

        _createClass(PromiseManagerSingle, [{
            key: "getPromise",
            value: function getPromise() {
                this.promise = this.promise || new _Deferred2.default();

                return this.promise;
            }
        }, {
            key: "getNewPromise",
            value: function getNewPromise() {
                // For single request mode (pagination) if there is another request in flight,
                // cancel it and use this one. No sense in fetching the old one if we've moved on
                // to another page or changed the sort order.
                if (this.promise) {
                    this.promise.cancel();
                }

                this.promise = new _Deferred2.default();

                return this.promise;
            }
        }, {
            key: "resolvePromise",
            value: function resolvePromise(results) {
                // Don't resolve it if we don't have a promise. Note, if we call this without a promise that's
                // likely a bug that needs to be investigated
                if (this.promise) {
                    this.promise.resolve(results);
                    this.promise = null;
                }
            }
        }, {
            key: "sort",
            value: function sort() {}
            // Do nothing since we clear the promise on every request to this instance

            // Clean up this instance

        }, {
            key: "destroy",
            value: function destroy() {
                if (this.promise) {
                    this.promise.cancel();
                    this.promise = null;
                }
            }
        }]);

        return PromiseManagerSingle;
    }();

    exports.default = PromiseManagerSingle;
});
//# sourceMappingURL=PromiseManagerSingle.js.map
;
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define('hui-react/table/CallbackCollection',["exports", "dstore/Store", "dstore/QueryResults", "./PromiseManagerSingle"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require("dstore/Store"), require("dstore/QueryResults"), require("./PromiseManagerSingle"));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.Store, global.QueryResults, global.PromiseManagerSingle);
        global.CallbackCollection = mod.exports;
    }
})(this, function (exports, _Store2, _QueryResults, _PromiseManagerSingle) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _Store3 = _interopRequireDefault(_Store2);

    var _QueryResults2 = _interopRequireDefault(_QueryResults);

    var _PromiseManagerSingle2 = _interopRequireDefault(_PromiseManagerSingle);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var CallbackCollection = function (_Store) {
        _inherits(CallbackCollection, _Store);

        // Constructor

        function CallbackCollection(args) {
            _classCallCheck(this, CallbackCollection);

            var _this = _possibleConstructorReturn(this, (CallbackCollection.__proto__ || Object.getPrototypeOf(CallbackCollection)).call(this, args));

            // Set a name as an instance property so we can inspect the properties in cloned instances
            _this.name = "CallbackCollection";

            // The external callback to use to ask for data
            _this.onDataChanged = args.onDataChanged;

            // This is the state we are tracking in this instance across Table data fetches
            // It needs to be preserved when the store is cloned
            _this.state = {
                sortColumn: null,
                sortDescending: null,
                data: null,

                // Virtual scrolling requires managing multiple concurrent requests. Pagination only needs one at a time.
                // We only support pagination for now.
                promiseManager: new _PromiseManagerSingle2.default()
            };
            return _this;
        }

        // Override
        //   @see https://github.com/SitePen/dstore/blob/master/src/Store.js

        _createClass(CallbackCollection, [{
            key: "sort",
            value: function sort(args) {
                var currentSort = args[0];

                this.state.sortColumn = currentSort.property;
                this.state.sortDescending = currentSort.descending;

                // Let the promise manager know we are sorting
                this.state.promiseManager.sort(this.state.sortColumn, this.state.sortDescending);

                return _get(CallbackCollection.prototype.__proto__ || Object.getPrototypeOf(CallbackCollection.prototype), "sort", this).call(this, args);
            }
        }, {
            key: "fetchRange",
            value: function fetchRange(args) {
                var results = undefined,
                    promise = undefined;
                var criteria = {
                    start: args.start,
                    end: args.end,
                    sortColumn: this.state.sortColumn,
                    sortDescending: this.state.sortDescending
                };

                // Handle the case where data is an empty object on the initial table load
                if (this.state.data && this.state.data.results) {
                    // We have the data so load it in the table
                    promise = this.state.promiseManager.getPromise(criteria);
                    results = this.createResults(promise);

                    this.state.promiseManager.resolvePromise(this.state.data, criteria);
                    this.state.data = null;
                } else {
                    // We don't have the data. Ask the consumer of the table for it.
                    promise = this.state.promiseManager.getNewPromise(criteria);
                    results = this.createResults(promise);

                    this.onDataChanged(criteria);
                }

                return results;
            }
        }, {
            key: "createResults",
            value: function createResults(promise) {
                return new _QueryResults2.default(promise.then(function (result) {
                    var data = result.results;

                    // Include the starting index for pagination. See the gotoPage() method in hui-table
                    // It's not good that we are modifying an array type but that's what dgrid expects :(
                    data.start = result.start + 1;

                    return data;
                }), {
                    totalLength: promise.then(function (result) {
                        return result.total;
                    })
                });
            }
        }, {
            key: "setData",
            value: function setData(data) {
                this.state.data = data;
            }
        }, {
            key: "destroy",
            value: function destroy() {
                this.state.promiseManager.destroy();
                this.onDataChanged = null;
                this.state = null;
            }
        }]);

        return CallbackCollection;
    }(_Store3.default);

    exports.default = CallbackCollection;
});
//# sourceMappingURL=CallbackCollection.js.map
;
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define('hui-react/table/EventFilters',["exports"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports);
        global.EventFilters = mod.exports;
    }
})(this, function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var EventFilters = function () {
        function EventFilters() {
            _classCallCheck(this, EventFilters);
        }

        _createClass(EventFilters, null, [{
            key: "noFilter",
            value: function noFilter(event) {
                return event;
            }
        }, {
            key: "filterSelection",
            value: function filterSelection(event) {
                var rows = event.rows.map(function (row) {
                    return row.data;
                });

                // Return cleaned up results
                return {
                    // This is the row data for all rows that were selected/deselected by the
                    // event that triggered this
                    eventSelection: rows,

                    // This is the current selection for the overall table and NOT from the
                    // event that triggered this
                    // It will return an object with with row IDs as keys and true/false if they are
                    // selected or not
                    //
                    // {
                    //   1: true,
                    //   2: false
                    // }
                    tableSelectionById: event.grid.selection
                };
            }
        }]);

        return EventFilters;
    }();

    exports.default = EventFilters;
});
//# sourceMappingURL=EventFilters.js.map
;
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define('hui-react/table/config',["exports", "./EventFilters"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require("./EventFilters"));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.EventFilters);
        global.config = mod.exports;
    }
})(this, function (exports, _EventFilters) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _EventFilters2 = _interopRequireDefault(_EventFilters);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    exports.default = {

        // Custom options or options that require special handling. These options are specific to this React wrapper and we need to adapt them before we apply them to
        // HATable instance.
        customOptions: {
            onOtherSettingsRender: true,
            renderModes: true,
            onTableBarCustomRender: true,
            onTableBarCustomActionRender: true,
            virtual: true,
            totals: true
        },

        // Expose some methods on this React wrapper to call the corresponding API methods on
        // the underlying table instance.
        //   @see https://facebook.github.io/react/tips/expose-component-functions.html
        apiToExpose: {
            clearErrors: true,
            onClickEdit: true,
            refresh: true,
            resize: true,
            resizeColumnWidth: true,
            revert: true,
            save: true
        },

        // A list of callback functions and events they correspond to on the underlying
        // HATable instance. We'll listen for these events and call the corresponding
        // callbacks to make this component more React friendly.
        eventsToCallbacks: {
            onCancel: {
                name: "edit-cancel",
                filter: _EventFilters2.default.noFilter
            },
            onColumnHiddenChange: {
                name: "column-hidden-change",
                filter: _EventFilters2.default.noFilter
            },
            onColumnResize: {
                name: "column-resize",
                filter: _EventFilters2.default.noFilter
            },
            onDatachange: {
                name: "datachange",
                filter: _EventFilters2.default.noFilter
            },
            onDeselect: {
                name: "batch-deselect",
                filter: _EventFilters2.default.filterSelection
            },
            onError: {
                name: "error",
                filter: _EventFilters2.default.noFilter
            },
            onExport: {
                name: "export",
                filter: _EventFilters2.default.noFilter
            },
            onRefresh: {
                name: "refresh",
                filter: _EventFilters2.default.noFilter
            },
            onSelect: {
                name: "batch-select",
                filter: _EventFilters2.default.filterSelection
            },
            onSave: {
                name: "edit-save",
                filter: _EventFilters2.default.noFilter
            },
            onSort: {
                name: "sort",
                filter: _EventFilters2.default.noFilter
            }
        }

    };
});
//# sourceMappingURL=config.js.map
;
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define('hui-react/table/PropUtils',["exports"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports);
        global.PropUtils = mod.exports;
    }
})(this, function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
    } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
    };

    // Check and see if the param is an object and not null, an array, or a function
    var isObject = function isObject(obj) {
        return !!obj && (typeof obj === "undefined" ? "undefined" : _typeof(obj)) === "object" && !Array.isArray(obj);
    },

    // Get the common error prefix string
    getPrefix = function getPrefix(propName, componentName) {
        return "for prop '" + propName + "' in '" + componentName + ".'";
    };

    // A static class with utilities for working with Table props
    exports.default = {

        // Generate a key based on the criteria passed in

        getKey: function getKey(criteria) {
            return criteria.start + "-" + criteria.end + "-" + criteria.sortColumn + "-" + criteria.sortDescending;
        },

        // Validate the table's data prop
        validateData: function validateData(props, propName, componentName) {
            var error = undefined;
            var prefix = getPrefix(propName, componentName);

            if (props.collection && !props.data && !props.onDataChanged) {
                error = null;
            } else if (!props.collection && props.onDataChanged && isObject(props.data)) {
                error = null;
            } else if (props.collection && (props.data || props.onDataChanged)) {
                error = new Error("(101) " + prefix + " Prop 'collection' was specified but is not allowed when using props 'data' or 'onDataChanged'.");
            } else if (props.onDataChanged && !isObject(props.data)) {
                error = new Error("(102) " + prefix + " Prop 'onDataChanged' was specified but was not accompanied by prop 'data' of type object.");
            } else if (!Array.isArray(props.data)) {
                error = new Error("(103) " + prefix + " Prop 'data' must be an array. Type '" + _typeof(props.data) + "' was found.");
            } else {
                error = null;
            }

            return error;
        },

        // Validate the table's options prop
        validateOptions: function validateOptions(props, propName, componentName) {
            var error = undefined;
            var prefix = getPrefix(propName, componentName);

            if (!props.options) {
                error = null;
            } else if (!isObject(props.options)) {
                error = new Error("(201) " + prefix + " Prop 'options' must be an object. Type '" + _typeof(props.options) + "' was found.");
            } else if (props.options.virtual && props.onDataChanged) {
                error = new Error("(202) " + prefix + " Prop 'onDataChanged' was specified but it does not work with the 'virtual' true option.");
            } else {
                error = null;
            }

            return error;
        }
    };
});
//# sourceMappingURL=PropUtils.js.map
;
define('hui/table/LazyRowExpansionRenderer',[
    'hui/table/DefaultRenderer',
    'object-utils/classes',
    'hui/core/keys',
    'hui/core/a11y',
    'hui/core/utils'
], function(DefaultRenderer, classes, keys, a11y, utils) {
    /**
     * Counter for generating unique IDs for row expansions
     * @type {number}
     * @private
     */
    var counter = 0, timer = '';

    /**
     * Returns whether the expansion's visibility should be toggled. If the click event
     * came from an input field, button, or anchor, then it is presumably meant to perform some other action,
     * and the expansion should remain in its current state. Similarly, if the click was inside the batch cell
     * then it should also be ignored. This method assumes that activatorSelector is not being used, as in that case
     * any click within the targeted area should toggle visibility.
     * @param {Event} clickEvent
     * @param {string} batchClass
     * @returns {boolean}
     */
    function shouldToggle(clickEvent, batchClass) {
        var toggle = true;
        if (clickEvent && clickEvent.target) {
            var element = clickEvent.target;

            while (element) {
                if (element.tagName === 'HA-TABLE') {
                    break;
                }
                if (element.classList.contains(batchClass)) {
                    toggle = false;
                    element = null;
                } else {
                    element = element.parentElement;
                }
            }
            if (clickEvent.target.tagName === 'HA-CHECKBOX' || clickEvent.target.tagName === 'HA-RADIO-BUTTON' ||
                clickEvent.target.tagName === 'INPUT' || clickEvent.target.tagName === 'BUTTON' ||
                clickEvent.target.tagName === 'A') {
                toggle = false;
            }
        }

        return toggle;
    }

    function _addTableAnimation(table, isEnabled) {
        if (isEnabled) {
            table.querySelector('.dgrid-grid').classList.add('animate-height');
        } else {
            table.querySelector('.dgrid-grid').classList.remove('animate-height');
        }
    }

    return classes.extend(DefaultRenderer, {
        constructor: function(options) {
            options = options || {};
            /**
             * Renders the content of the expanded area. This content is placed below the 'header' in the expanded
             * area, which really is just a div to hold the close button.
             * @type {Function}
             */
            this.renderRowExpansionContent = options.renderRowExpansionContent || function(object) {
                var rowExpansionContentDiv = this.table.ownerDocument.createElement('div'),
                    id = this.table.store.getIdentity(object);
                rowExpansionContentDiv.textContent = 'RowExpansion content for row with object id: ' + id;
                return rowExpansionContentDiv;
            };
            /**
             * Options CSS selector that specifies the element within each row that should trigger the expansion to
             * be displayed/hidden. If not specified, clicking any of the cells will display the expansion
             *
             * @type {string}
             */
            this.activatorSelector = options.activatorSelector;

            /**
             * Optional value to set the height of the row expansion.
             * Should be a numeric value indicating the height in pixels.
             *
             * @type {number}
             */
            this.expansionHeight = options.expansionHeight;

            this.manualActivation = options.manualActivation || false;

            this.expansionClassName = options.expansionClassName;

            this.useFocusIndicator = options.useFocusIndicator || false;

            this.focusIndicatorLabel = options.focusIndicatorLabel || '';

            this._expandedRows = {};

            /**
             * Optional value to specify whether the last expanded row should be scrolled to the top
             * of the table. Defaults to false, which means never scroll.
             * @type {number}
             */
            this.scrollingThreshold = options.scrollingThreshold || false;

            /**
             * Optional value specifying whether expanded rows force the table to resize. Defaults to false.
             * @type {boolean}
             */
            this.autoResizeTable = options.autoResizeTable || false;

            // If the whole row should trigger expansion, than only the batch cell should trigger selection
            if (!options.activatorSelector) {
                this.tableConfig = {
                    selectionMode: 'none'
                };
            }
        },

        /**
         * By default we don't want to let clicks leak out of the expansion content. It can handle its own events and
         * other listeners on the table might not anticipate a click coming from this content. This could be explicitly
         * overridden if for some reason the table needs to handle these click events.
         */
        _expansionMouseHandler: function(event) {
            // Avoid complications with batch mode or other table mouse event listeners by preventing events in the
            // expansion from bubbling out.
            event.stopPropagation();
        },

        /**
         * Toggles the visiblity of the passed element, unless hide is passed to force
         * the element to be shown or hidden
         * @param {HTMLElement} row
         * @param {boolean} hide
         * @param {HTMLElement} activatorElement The element that toggles display of the expanded content
         */
        _toggleRowExpansion: function(row, hide, activatorElement) {
            if (timer !== '') {
                clearTimeout(timer);
                timer = '';
            }
            timer = setTimeout(function() {
                var rowExpansion = row.querySelector('.ha-table-row-expansion'),
                   tableRow = this.table.row(row),
                   shouldShow,
                   midAnimation;
                if (!rowExpansion) {
                    this.lazyRenderRowExpansion(row, hide, activatorElement);
                    rowExpansion = row.querySelector('.ha-table-row-expansion');
                }
                if (row.querySelector('.' + this.batchClass)) {
                    rowExpansion.classList.add('batch-table-expansion');
                    rowExpansion.classList.remove('no-batch-table-expansion');
                } else {
                    rowExpansion.classList.add('no-batch-table-expansion');
                    rowExpansion.classList.remove('batch-table-expansion');
                }
                if (typeof hide !== 'undefined' && hide !== null) {
                    shouldShow = !Boolean(hide);
                } else {
                    midAnimation = rowExpansion.classList.contains('hidden') !== rowExpansion.classList.contains('hide-expansion');
                    shouldShow =  rowExpansion.classList.contains('hidden');
                }

                if (midAnimation) {
                    return;
                }

                if (shouldShow) {
                    row.classList.add('row-expanded');
                    this._expandedRows[tableRow.id] = true;

                    rowExpansion.classList.remove('hidden');
                    if (this.useFocusIndicator) {
                        row.classList.add('show-focus');
                    }
                    setTimeout(function() {
                        rowExpansion.classList.remove('hide-expansion');
                        this._handleFocusAndAriaAttributes(rowExpansion, activatorElement, row);
                    }.bind(this), 0);

                    if (this.scrollingThreshold !== false) {
                        var scroller = row;

                        while (scroller && !scroller.classList.contains('dgrid-scroller')) {
                            scroller = scroller.parentElement;
                        }

                        if (scroller) {
                            setTimeout(function() {
                                var viewport = scroller.getBoundingClientRect(),
                                    rowViewport = row.getBoundingClientRect();

                                if ((viewport.bottom - rowViewport.top) / rowViewport.height < this.scrollingThreshold) {
                                    utils.animateScrollTo(scroller, row.offsetTop, 150);
                                }
                            }.bind(this), 50);
                        }
                    }

                    this._autoResize();
                } else {
                    row.classList.remove('row-expanded');
                    delete this._expandedRows[tableRow.id];

                    rowExpansion.classList.add('hide-expansion');

                    if (this.useFocusIndicator) {
                        row.classList.remove('show-focus');
                    }

                    setTimeout(function() {
                        rowExpansion.classList.add('hidden');
                    }.bind(this), 350);

                    if (this.autoResizeTable) {
                        setTimeout(function() {
                            _addTableAnimation(this.table, true);

                            this.table._calculateInitialHeight({type: 'row-expander-resize'});
                            setTimeout(function() {
                                _addTableAnimation(this.table, false);
                            }.bind(this), 250);
                        }.bind(this), 250);
                    }

                    this._handleFocusAndAriaAttributes(rowExpansion, activatorElement, row);
                }
            }.bind(this), 250);
        },

        lazyRenderRowExpansion: function(row, hide, activatorElement) {
            var table = this.table,
                rowExpansion = table.ownerDocument.createElement('div'),
                toggleRowExpansion = function(event, hide) {
                    if (this.activatorSelector || shouldToggle(event, this.batchClass)) {
                        this._toggleRowExpansion(row, hide, activatorElement);
                    }
                }.bind(this),
                forceToggleRowExpansion = function(event, hide) {
                    this._toggleRowExpansion(row, hide, activatorElement);
                }.bind(this),
                rowExpansionKeyDownEventListener = function(event) {
                    if (event.keyCode === keys.ESCAPE) {
                        toggleRowExpansion();
                    }
                    a11y.keepFocusInsideListener(event, rowExpansion);
                }.bind(this),
                object = activatorElement._expansionData,
                rowExpansionContent = this.renderRowExpansionContent(object, forceToggleRowExpansion),
                closeButton = table.ownerDocument.createElement('button'),
                batchCell = row.querySelector('.' + this.batchClass),
                cleanupRowExpansion;

            rowExpansion.id = activatorElement._expansionId;

            if (this.expansionHeight) {
                rowExpansion.style.height = this.expansionHeight + 'px';
            }
            closeButton.className = 'hi hi-close close-expansion-button';
            closeButton.addEventListener('click', forceToggleRowExpansion);
            closeButton.setAttribute('aria-label', 'Close expanded row');

            rowExpansion.appendChild(rowExpansionContent);

            if (!this.manualActivation) {
                rowExpansionContent.appendChild(closeButton);

                rowExpansion.setAttribute('tabindex', '-1');

                rowExpansion.addEventListener('keydown', rowExpansionKeyDownEventListener);
                // Prevent mouse/touch events from bubbling
                rowExpansion.addEventListener('click', this._expansionMouseHandler);
                rowExpansion.addEventListener('mousedown', this._expansionMouseHandler);
                rowExpansion.addEventListener('touchstart', this._expansionMouseHandler);
            }

            rowExpansion.className = 'ha-table-row-expansion';

            if (!(object.id in this._expandedRows)) {
                rowExpansion.classList.add('hide-expansion');
                rowExpansion.classList.add('hidden');
            }

            if (this.expansionClassName) {
                rowExpansion.classList.add(this.expansionClassName);
            }

            if (batchCell) {
                rowExpansion.classList.add('batch-table-expansion');
                row.classList.add('row-expanded');
            } else {
                rowExpansion.classList.add('no-batch-table-expansion');
            }

            if (this.useFocusIndicator) {
                var focusIndicator = document.createElement('button'),
                    focusIndicatorClickEventListener = function() {
                        this._toggleRowExpansion(row, true, activatorElement);
                    }.bind(this);

                focusIndicator.className = 'focus-indicator hi hi-chevron-down';
                if (this.focusIndicatorLabel) {
                    focusIndicator.setAttribute('aria-label', this.focusIndicatorLabel);
                }
                focusIndicator.addEventListener('click', focusIndicatorClickEventListener);

                row.appendChild(focusIndicator);
            }

            cleanupRowExpansion = function() {

                if (closeButton && closeButton.removeEventListener) {
                    closeButton.removeEventListener('click', forceToggleRowExpansion);
                    //remove the close button created previously
                    if (rowExpansionContent && rowExpansionContent.removeChild) {
                        rowExpansionContent.removeChild(closeButton);
                    }
                }

                if (focusIndicator && focusIndicator.removeEventListener) {
                    focusIndicator.removeEventListener('click', focusIndicatorClickEventListener);
                }

                if (rowExpansion && rowExpansion.removeEventListener) {
                    rowExpansion.removeEventListener('keydown', rowExpansionKeyDownEventListener);
                    rowExpansion.removeEventListener('click', this._expansionMouseHandler);
                    rowExpansion.removeEventListener('mousedown', this._expansionMouseHandler);
                    rowExpansion.removeEventListener('touchstart', this._expansionMouseHandler);
                }
            };

            rowExpansion.cleanUpListeners  = function() {

                if (cleanupRowExpansion) {
                    cleanupRowExpansion();
                }

                if (rowExpansionContent && rowExpansionContent.destroy) {
                    rowExpansionContent.destroy();
                }
            };

            row.appendChild(rowExpansion);
        },

        /**
         * Focus the expanded area or activating element, publish close or show event, and set the value
         * of the aria-expanded attribute as appropriate.
         * @param {HTMLElement} rowExpansion The content that has been expanded or collapsed
         * @param {HTMLElement} activatorElement The element that toggles the display of the expansion content
         * @param {*} row The owning row
         * @private
         */
        _handleFocusAndAriaAttributes: function(rowExpansion, activatorElement, row) {
            if (rowExpansion.classList.contains('hide-expansion')) {
                if (!activatorElement.hasAttribute('tabindex')) {
                    activatorElement.setAttribute('tabindex', '-1');
                    //one time invoking listener
                    activatorElement.addEventListener('blur', function removeTabIndex() {
                        activatorElement.removeAttribute('tabindex');
                        activatorElement.removeEventListener('blur', removeTabIndex);
                    });
                }

                activatorElement.focus();
                activatorElement.setAttribute('aria-expanded', false);
                row.classList.remove('highlighted-dgrid-row');
                this.table.emit('expandable-row-close', {
                    bubbles: false,
                    row: row
                });
            } else {
                activatorElement.setAttribute('aria-expanded', true);
                row.classList.add('highlighted-dgrid-row');
                rowExpansion.focus();
                this.table.emit('expandable-row-show', {
                    bubbles: false,
                    row: row
                });
            }
        },

        /**
         * Adjust the height of the table to accomodate any new content.
         */
        _autoResize: function() {
            if (this.autoResizeTable) {
                setTimeout(function() {
                    this.table._calculateInitialHeight({type: 'row-expander-resize'});
                }.bind(this), 0);
            }
        },

        /**
         * Adds event listeners to handle showing/hiding it
         * @param {HTMLElement} row The grid row element
         * @param {Object} object The object being rendered for this cell.
         * @returns {*} The row element the expansion was added to
         */
        addExpansionListeners: function(row, object) {
            var activatorElement = row.querySelector('table') || row,
                toggleRowExpansion = function(event, hide) {
                    if (this.activatorSelector || shouldToggle(event, this.batchClass)) {
                        this._toggleRowExpansion(row, hide, activatorElement);
                    }
                }.bind(this),
                keyboardEventHandler = function(event) {
                    if (event.keyCode === keys.ENTER || event.keyCode === keys.SPACEBAR) {
                        toggleRowExpansion(event);
                    }
                },
                expansionId,
                cleanupRowListeners;

            //function to cleanup any event listeners prior to binding or row destruction
            cleanupRowListeners = function() {
                if (activatorElement && activatorElement.removeEventListener) {
                    activatorElement.removeEventListener('click', toggleRowExpansion);
                    if (activatorElement.tagName !== 'BUTTON') {
                        activatorElement.removeEventListener('keydown', keyboardEventHandler);
                    }
                }
            };
            if (!this.manualActivation) {

                if (this.activatorSelector) {
                    // In this case a custom selector has been provided and only that element should activate
                    // the rowExpansion
                    activatorElement = row.querySelector(this.activatorSelector);
                }
                expansionId = 'table-row-expansion' + counter++;
                activatorElement._expansionId = expansionId;
                activatorElement._expansionData = object;
                activatorElement._keyboardEventHandler = keyboardEventHandler;
                activatorElement.setAttribute('aria-controls', expansionId);
                activatorElement.setAttribute('aria-expanded', false);

                //clean up listeners prior to adding them
                if (cleanupRowListeners) {
                    cleanupRowListeners();
                }

                if (activatorElement && activatorElement.addEventListener) {
                    activatorElement.addEventListener('click', toggleRowExpansion);
                    if (activatorElement.tagName !== 'BUTTON') {
                        activatorElement.addEventListener('keydown', keyboardEventHandler);
                    }
                }
            }
            //re-render the expansion if it was previously expanded
            if (this._expandedRows && (true === this._expandedRows[object.id])) {
                //kick off rendering of expansion content
                this.lazyRenderRowExpansion(row, false, activatorElement);

                // Adjust the table height
                this._autoResize();
            }
            //Provide cleanup for anything created in the row formatter.
            row.destroy = function() {
                var rowExpansion = row.querySelector('.ha-table-row-expansion');

                if (rowExpansion && rowExpansion.cleanUpListeners) {
                    rowExpansion.cleanUpListeners();
                }

                if (cleanupRowListeners) {
                    cleanupRowListeners();
                }
            };

            return row;
        },

        row: function(object, options, defaultRender) {
            var defaultRow = defaultRender();

            return this.addExpansionListeners(defaultRow, object, options);
        },

        setup: function() {
            this.batchClass = 'field-' + this.table.batchField;
        }
    });
});


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define('hui-react/table/Table',["exports", "react", "react-dom", "dstore/Memory", "./CallbackCollection", "./config", "./PropUtils", "put-selector/put", "hui/table/LazyRowExpansionRenderer", "hui/table", "hui/table-virtual", "xstyle/css!hui-css/hui-table.min.css"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require("react"), require("react-dom"), require("dstore/Memory"), require("./CallbackCollection"), require("./config"), require("./PropUtils"), require("put-selector/put"), require("hui/table/LazyRowExpansionRenderer"), require("hui/table"), require("hui/table-virtual"), require("xstyle/css!hui-css/hui-table.min.css"));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.react, global.reactDom, global.Memory, global.CallbackCollection, global.config, global.PropUtils, global.put, global.LazyRowExpansionRenderer, global.table, global.tableVirtual, global.huiTableMin);
        global.Table = mod.exports;
    }
})(this, function (exports, _react, _reactDom, _Memory, _CallbackCollection, _config, _PropUtils, _put, _LazyRowExpansionRenderer) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _react2 = _interopRequireDefault(_react);

    var _reactDom2 = _interopRequireDefault(_reactDom);

    var _Memory2 = _interopRequireDefault(_Memory);

    var _CallbackCollection2 = _interopRequireDefault(_CallbackCollection);

    var _config2 = _interopRequireDefault(_config);

    var _PropUtils2 = _interopRequireDefault(_PropUtils);

    var _put2 = _interopRequireDefault(_put);

    var _LazyRowExpansionRenderer2 = _interopRequireDefault(_LazyRowExpansionRenderer);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var Table = function (_React$Component) {
        _inherits(Table, _React$Component);

        _createClass(Table, null, [{
            key: "displayName",
            get: function get() {
                return "Table";
            }
        }, {
            key: "propTypes",
            get: function get() {
                return {
                    columns: _react2.default.PropTypes.object.isRequired,
                    data: _PropUtils2.default.validateData,
                    onDataChanged: _react2.default.PropTypes.func,
                    collection: _react2.default.PropTypes.object,
                    options: _PropUtils2.default.validateOptions,
                    pause: _react2.default.PropTypes.bool
                };
            }
        }]);

        function Table(props) {
            _classCallCheck(this, Table);

            var _this = _possibleConstructorReturn(this, (Table.__proto__ || Object.getPrototypeOf(Table)).call(this, props));

            // Namespace for API methods to expose on this instance.
            //   @see https://facebook.github.io/react/tips/expose-component-functions.html
            _this.api = {};

            // List other instance props for documentation
            _this.store = null;
            _this.totals = null;
            _this.table = null;
            _this.cache = {};
            _this.otherSettingsNode = null;
            _this.tableBarCustomNode = null;
            _this.tableBarCustomActionNode = null;
            return _this;
        }

        // React component lifecycle
        //   @see https://facebook.github.io/react/docs/component-specs.html#mounting-componentdidmount

        _createClass(Table, [{
            key: "componentDidMount",
            value: function componentDidMount() {
                var _this2 = this;

                // Create a version of HATable in memory
                this.table = this.renderTable();

                // Add the full table domNode to the component
                // Although this is not the most efficient use of React it does allow us to reuse the full
                // table implementation
                this.wrapper.appendChild(this.table);

                // Apply any post render changes
                // Set time out since for FF and Safari polyfill, need wait for wrapper finish appending child
                setTimeout(function () {
                    _this2.postTableRender(_this2.table, _this2.props.options, _this2.props.data);
                }, 0);
            }
        }, {
            key: "shouldComponentUpdate",
            value: function shouldComponentUpdate(nextProps) {
                // Note: It's harder than you might think to find a good way to intelligently
                // and efficiently refresh only the props that changed. So we refresh all of them
                // each time. It's not an impossible problem to solve but will require some thinking to
                // overcome some of the challenges below.
                //
                // Some of the challenges for a smart refresh include:
                //   * It's expensive to do a diff to see if the row data set has changed
                //   * Some of the table properties require you to call table.refresh()
                //     for the changes to show up. Others like changing rowsPerPage or columns will trigger
                //     a refresh automatically. That's why we have the column setter last so it does a refresh.
                //   * If the user is using data callbacks to control the data for pagination or virtual scrolling,
                //     calling table.refresh will also trigger a call from us to request the data from the server again.
                //     So we have to be careful about when we trigger that outbound request for data. We don't, for example,
                //     want to trigger it for simple option changes. To make that work we set the data and refresh it each
                //     time. If you use diffs to isolate data only state changes in an attempt to bypass the full table
                //     refresh and simply resolve the data promise, the table will load very efficiently but data will
                //     not be available the next time you do a simple prop change. When that happens it will issue
                //     an outboud request.

                // HUI-4158: adding support for 'pause' attribute of data
                // allows users to specify if they are still waiting for data
                if (!nextProps.pause) {
                    // Only allow specific updates to the underlying table.
                    this.mixinOptions(this.table, nextProps.options);
                    this.connectCallbacks(this.table, nextProps.options);

                    // Update the store data (if needed)
                    this.setStoreData(nextProps.data);

                    // Apply any post render changes
                    this.postTableRender(this.table, nextProps.options, nextProps.data);

                    // Update the columns
                    // Setting the columns triggers a table refresh so do this last
                    this.table.columns = this.adaptColumns(nextProps.columns);
                } else {
                    // allow user to specify pause to clear table and put in loading message
                    // necessary for relay data callbacks: HUI-4158
                    var dgrid = this.table.table,
                        contentNode = dgrid.contentNode;
                    this.cleanupContent(dgrid);
                    var loadingNode = dgrid.loadingNode = (0, _put2.default)(contentNode, "div.dgrid-loading[role=alert]");
                    loadingNode.innerHTML = dgrid.loadingMessage;
                }

                // Don't render the whole table again. We render it once and apply approved changes.
                return false;
            }
        }, {
            key: "componentWillUnmount",
            value: function componentWillUnmount() {
                // Clean React nodes
                if (this.otherSettingsNode) {
                    _reactDom2.default.unmountComponentAtNode(this.otherSettingsNode);
                }
                if (this.tableBarCustomNode) {
                    _reactDom2.default.unmountComponentAtNode(this.tableBarCustomNode);
                }
                if (this.tableBarCustomActionNode) {
                    _reactDom2.default.unmountComponentAtNode(this.tableBarCustomActionNode);
                }

                // Clear the cache
                this.clearCache();

                // Clean up the store
                if (this.store.destroy) {
                    this.store.destroy();
                }

                // Clean up all our table references
                this.table = null;
                this.api = null;
                this.totals = null;
                this.store = null;
                this.wrapper = null;
                this.otherSettingsNode = null;
                this.tableBarCustomNode = null;
                this.tableBarCustomActionNode = null;
                this.cache = null;
            }
        }, {
            key: "cleanupContent",
            value: function cleanupContent(grid) {
                if (grid.noDataNode) {
                    (0, _put2.default)(grid.noDataNode, "!");
                    delete grid.noDataNode;
                } else {
                    grid.cleanup();
                }
                grid.contentNode.innerHTML = "";
            }
        }, {
            key: "clearCache",
            value: function clearCache() {
                var _this3 = this;

                Object.keys(this.cache).forEach(function (key) {
                    _reactDom2.default.unmountComponentAtNode(_this3.cache[key]);
                });

                this.cache = {};
            }
        }, {
            key: "handleWrapperRef",
            value: function handleWrapperRef(wrapper) {
                this.wrapper = wrapper;
            }
        }, {
            key: "shouldUpdateTableProperty",
            value: function shouldUpdateTableProperty(table, key, value) {
                // Don't update the key if it's already set or if it's a key that requires special handling
                return !_config2.default.customOptions[key] && !_config2.default.eventsToCallbacks[key] && table[key] !== value;
            }
        }, {
            key: "connectCallbacks",
            value: function connectCallbacks(table, options) {
                if (table && options) {
                    Object.keys(_config2.default.eventsToCallbacks).forEach(function (key) {
                        var callback = options[key];
                        var callbackDef = undefined,
                            name = undefined,
                            filter = undefined;

                        // If the callback exists in the options passed in
                        if (callback) {
                            callbackDef = _config2.default.eventsToCallbacks[key];
                            name = callbackDef.name;
                            filter = callbackDef.filter;

                            // Remove the old one (if any) and add the new one
                            table.off(name);
                            table.on(name, function (event) {
                                // Filter the event object so the results are React friendly
                                // before we pass it to the callback function.
                                var e = filter(event);
                                callback(e);
                            });
                        }
                    });
                }
            }
        }, {
            key: "mixinOptions",
            value: function mixinOptions(table, options) {
                var _this4 = this;

                if (table && options) {
                    Object.keys(options).forEach(function (key) {
                        var value = options[key];

                        // Only update the key if we need to
                        if (_this4.shouldUpdateTableProperty(table, key, value)) {
                            table[key] = value;
                        }
                    });
                }
            }
        }, {
            key: "adaptColumns",
            value: function adaptColumns(cols) {
                var _this5 = this;

                var columns = {};

                // Loop through all of the columns
                Object.keys(cols).forEach(function (key) {
                    var onRenderCell = undefined;
                    var that = _this5;

                    columns[key] = cols[key];
                    onRenderCell = columns[key].onRenderCell; // eslint-disable-line prefer-const

                    // If the column has a custom renderer, adapt it so it is compatible with HATable.
                    if (onRenderCell) {
                        columns[key].renderCell = function (rowData, value, node, options) {
                            var Element = onRenderCell({
                                // Don't pass the node to the consumer. It doesn't make sense in a React world.
                                rowData: rowData,
                                value: value,
                                options: options,
                                column: this.field
                            });
                            return that.renderReactCell(Element, this.field, rowData, value, node);
                        };
                    } else {}
                    // No overrides. Do nothing...

                    // Check if there is a header cell customization
                    if (columns[key].onRenderHeaderCell) {
                        columns[key].renderHeaderCell = function (node) {
                            var Element = columns[key].onRenderHeaderCell();
                            if (Element) {
                                _reactDom2.default.render(Element, node);
                            }
                        };
                    }
                });

                return columns;
            }
        }, {
            key: "renderReactCell",
            value: function renderReactCell(Element, columnId, rowData, value, node) {
                var id = this.store.getIdentity(rowData),
                    key = this.getCellKey(id, columnId),
                    cachedNode = this.cache[key],

                // If we have the React Node in the cache, use it
                // Otherwise create an empty node to put it in.
                n = cachedNode || document.createElement("div");

                // Render the element to the node for the row
                _reactDom2.default.render(Element, n);

                // Add the React node to the cache so we can use it later (if needed)
                this.cache[key] = n;

                // Add the React node to the cell node
                node.appendChild(n);
            }
        }, {
            key: "getCellKey",
            value: function getCellKey(rowId, columnId) {
                return rowId + "-" + columnId;
            }
        }, {
            key: "getStore",
            value: function getStore() {
                var store = undefined;

                if (this.store) {
                    store = this.store;
                } else if (this.props.collection) {
                    store = this.props.collection;
                } else if (this.props.onDataChanged) {
                    store = new _CallbackCollection2.default({
                        onDataChanged: this.props.onDataChanged,
                        allowMultipleConcurrentRequests: this.props.options.virtual
                    });
                } else {
                    store = new _Memory2.default();
                }

                return store;
            }
        }, {
            key: "shouldSyncCallbackCollection",
            value: function shouldSyncCallbackCollection() {
                return this.table && this.table.table && this.table.table._renderedCollection && this.table.table._renderedCollection.name === "CallbackCollection";
            }
        }, {
            key: "setStoreData",
            value: function setStoreData(data) {
                if (data) {
                    this.store.setData(data);

                    // For sorting operations HA Table maintains a copy of the store data. It is cloned via
                    // https://github.com/SitePen/dstore/blob/master/src/QueryMethod.ts#L56
                    // In these cases our store's fetchRange method may be called with the copy of the store
                    // (_renderedCollection). It looks like there is some type of race condition where the
                    // CallbackCollection store is setting state on the main store after the collection has
                    // been cloned. In that case the copy of the store needs to have the updated state set on it
                    // so it is available to the store during fetchRange.
                    //
                    // This if statement transfers the state to the copy
                    if (this.shouldSyncCallbackCollection()) {
                        this.table.table._renderedCollection.state = this.store.state;
                    }
                }
            }
        }, {
            key: "exposeApi",
            value: function exposeApi(table) {
                var _this6 = this;

                Object.keys(_config2.default.apiToExpose).forEach(function (key) {
                    _this6.api[key] = function () {
                        // Proxy the call on this component to the API method on the underlying
                        // HATable instance
                        return table[key].apply(table, arguments); //eslint-disable-line prefer-spread
                    };
                });
            }
        }, {
            key: "addRenderModes",
            value: function addRenderModes(table, options) {
                var that = this;
                //add render modes now
                if (options && options.renderModes) {
                    options.renderModes.forEach(function (renderModeItem) {
                        var expansionHeight = renderModeItem.renderer.expansionHeight,
                            activatorSelector = renderModeItem.renderer.activatorSelector,
                            autoResizeTable = renderModeItem.renderer.autoResizeTable,
                            scrollingThreshold = renderModeItem.renderer.scrollingThreshold,
                            expansionClassName = renderModeItem.renderer.expansionClassName,
                            useFocusIndicator = renderModeItem.renderer.useFocusIndicator,
                            focusIndicatorLabel = renderModeItem.renderer.focusIndicatorLabel;

                        var renderRowExpansionContent = null,
                            CustomRowExpansionRenderer = null;

                        //if the custom row expansion function is defined, use it
                        if (renderModeItem.renderer.onRenderRowExpansionContent) {
                            //setup the callback for row expansion
                            renderRowExpansionContent = function renderRowExpansionContent(object, hideExpansion) {
                                var ExpansionContent = renderModeItem.renderer.onRenderRowExpansionContent({
                                    object: object,
                                    hideExpansion: hideExpansion
                                });
                                return that.renderReactRowExpansionContent(ExpansionContent);
                            };
                        }
                        //use the internal LazyRowExpansionRenderer
                        CustomRowExpansionRenderer = _LazyRowExpansionRenderer2.default.bind(null, {
                            activatorSelector: activatorSelector,
                            expansionHeight: expansionHeight,
                            renderRowExpansionContent: renderRowExpansionContent,
                            autoResizeTable: autoResizeTable,
                            scrollingThreshold: scrollingThreshold,
                            expansionClassName: expansionClassName,
                            useFocusIndicator: useFocusIndicator,
                            focusIndicatorLabel: focusIndicatorLabel
                        });
                        //Add render mode to the main table
                        table.addRenderMode(renderModeItem.renderMode, new CustomRowExpansionRenderer());
                    });
                }
            }
        }, {
            key: "renderReactRowExpansionContent",
            value: function renderReactRowExpansionContent(ExpansionContent) {

                var n = document.createElement("div");
                // Render the expansion content
                _reactDom2.default.render(ExpansionContent, n);

                return n;
            }
        }, {
            key: "updateRowSelection",
            value: function updateRowSelection(table, data) {
                var _this7 = this;

                var d = data.results || data;

                // Only select rows if there are rows to select.
                // d could be null if the user is using data callbacks and it's the first one
                // where data hasn't been loaded into the table.
                if (d && d.length > 0) {
                    d.forEach(function (dataRow) {
                        var id = _this7.store.getIdentity(dataRow),
                            row = table.row(id);

                        // Table consumers must explicitly define if rows are selected
                        if (dataRow._selected === true) {
                            table.select(row);
                        } else if (dataRow._selected === false) {
                            table.deselect(row);
                        } else {
                            // Leave the section alone
                        }
                    });
                }
            }
        }, {
            key: "applyOtherSettings",
            value: function applyOtherSettings(table, options) {
                if (options.onOtherSettingsRender) {
                    var Element = options.onOtherSettingsRender();

                    // Render the React Element
                    // Keep a reference so we can unmount it later
                    _reactDom2.default.render(Element, table.otherSettingsNode);
                    this.otherSettingsNode = table.otherSettingsNode;
                } else {
                    // No customization
                }
            }
        }, {
            key: "applyTableBarCustomContent",
            value: function applyTableBarCustomContent(table, options) {
                // Left side of table bar
                if (options.onTableBarCustomRender) {
                    var Element = options.onTableBarCustomRender();

                    // Render the React Element
                    // Keep a reference so we can unmount it later
                    _reactDom2.default.render(Element, table.tableBarCustomNode);
                    this.tableBarCustomNode = table.tableBarCustomNode;
                }

                // Right side of table bar
                if (options.onTableBarCustomActionRender) {
                    var _Element = options.onTableBarCustomActionRender();

                    // Render the React Element
                    // Keep a reference so we can unmount it later
                    _reactDom2.default.render(_Element, table.tableBarCustomActionNode);
                    this.tableBarCustomActionNode = table.tableBarCustomActionNode;
                }
            }
        }, {
            key: "applyTotals",
            value: function applyTotals(table, options) {
                var _this8 = this;

                // Handle totals with a resize event.
                // Only attach the listener once
                if (options.totals && !this.totals) {
                    table.on("table-resize", function () {
                        table.totals = _this8.totals;
                    });
                }

                // Always update or clear the totals so they are reflected in the resize event (if attached)
                this.totals = options.totals;
            }
        }, {
            key: "postTableRender",
            value: function postTableRender(table, options, data) {
                if (options) {
                    this.applyOtherSettings(table, options);
                    this.applyTableBarCustomContent(table, options);
                    this.applyTotals(table, options);
                }

                if (data) {
                    // Select or deselect any rows during loading
                    this.updateRowSelection(table, data);
                }
            }
        }, {
            key: "renderTable",
            value: function renderTable() {
                var options = this.props.options,
                    type = options && options.virtual ? "ha-table-virtual" : "ha-table",

                // If virtual scrolling is enabled, create a virtual table. Otherwise create a regular table
                table = document.createElement(type);

                // Init the store
                this.store = this.getStore();
                this.setStoreData(this.props.data);

                // Initialize the table instance
                //   Add required and optional properties
                //   Connect events to callbacks
                //   Expose table API
                this.mixinOptions(table, options);
                this.connectCallbacks(table, options);
                table.collection = this.store;
                table.columns = this.adaptColumns(this.props.columns);
                this.exposeApi(table);

                //process row rendering, if any
                if (options && options.renderModes) {
                    this.addRenderModes(table, options);
                }

                return table;
            }
        }, {
            key: "render",
            value: function render() {
                var handleRef = this.handleWrapperRef.bind(this);

                // Render a root dom node to append the underlying HATable instance to.
                return _react2.default.createElement("div", { className: "ha-table-react-wrapper", ref: handleRef });
            }
        }]);

        return Table;
    }(_react2.default.Component);

    exports.default = Table;
});
//# sourceMappingURL=Table.js.map
;

define("../../build/dist/js/hui-table", function(){});

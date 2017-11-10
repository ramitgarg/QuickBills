var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(["exports", "react", "react-dom"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require("react"), require("react-dom"));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.react, global.reactDom);
        global.HAAside = mod.exports;
    }
})(this, function (exports, _react, _reactDom) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _react2 = _interopRequireDefault(_react);

    var _reactDom2 = _interopRequireDefault(_reactDom);

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

    var HAAside = function (_React$Component) {
        _inherits(HAAside, _React$Component);

        function HAAside(props) {
            _classCallCheck(this, HAAside);

            return _possibleConstructorReturn(this, (HAAside.__proto__ || Object.getPrototypeOf(HAAside)).call(this, props));
        }

        _createClass(HAAside, [{
            key: "render",
            value: function render() {
                /* jshint ignore:start */
                return _react2.default.createElement(
                    "aside",
                    this.props,
                    this.props.children
                );
                /* jshint ignore:end */
            }
        }]);

        return HAAside;
    }(_react2.default.Component);

    exports.default = HAAside;
});
//# sourceMappingURL=HAAside.js.map

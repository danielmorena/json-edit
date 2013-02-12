/*global define document CodeMirror*/
(function (root, factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['json.edit', 'jquery'],
               function (JsonEdit, jQuery) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.JsonEdit = factory(JsonEdit, jQuery));
        });
    } else {
        // Browser globals
        root.JsonEdit = factory(root.JsonEdit, root.jQuery);
    }
}(this, function (JsonEdit, $) {
    "use strict";
    var
        cache = {},
        escaper = document.createElement("textarea"),
        formatHints = JsonEdit.defaults.hintedFormatters,
        collectHints = JsonEdit.defaults.hintedCollectors;

    function escape(text) {
        if (escaper.innerText !== undefined) {
            escaper.innerText = text;
        } else {
            escaper.innerHTML = text;
        }

        return escaper.innerHTML;
    }

    function load(loadFun, path) {
        if (!cache[path]) {
            cache[path] = true;
            loadFun(path);
        }
    }

    formatHints.string = formatHints.string || {};

    formatHints.string.codemirror = function (name, type, id, opts, required, priv, util) {
        var
            codeId = id + "-codemirror",
            options = opts["je:codemirror"] || {},
            init = options.init || {},
            path = (options.path || "/"),
            addons = options.addons || [],
            content = opts["default"] || "";

        if (path[path.length - 1] !== "/") {
            path += "/";
        }

        load(priv.loadJs, path + "lib/codemirror.js");
        load(priv.loadCss, path + "lib/codemirror.css");

        if (options.mode) {
            load(priv.loadJs, path + "mode/" + options.mode);
        }

        addons.forEach(function (addon) {
            load(priv.loadJs, path + "addon/" + addon);
        });

        util.events.rendered.handleOnce(function () {
            var editor = CodeMirror.fromTextArea(document.getElementById(codeId), init);
            $("#" + codeId).data("codemirror", editor);
        });

        return {
            "textarea": {
                "id": codeId,
                "class": "codemirror-textarea",
                "$childs": escape(content)
            }
        };
    };

    collectHints.string = collectHints.string || {};

    collectHints.string.codemirror = function (key, field, schema, priv) {
        var
            textarea = field.find(".codemirror-textarea:first"),
            editor = textarea.data("codemirror"),
            result = editor.getValue();

        return {result: JsonEdit.makeResult(true, "ok", result), data: result};
    };

    return JsonEdit;
}));
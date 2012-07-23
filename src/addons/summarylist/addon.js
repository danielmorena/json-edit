/*global window define*/
(function (root, factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['require', 'jquery', 'jqueryui', 'json.edit', 'json.schema', 'nsgen',
               'json', 'dustjs'],
               function (require, $, $ui, JsonEdit, JsonSchema, NsGen, JSON, Dust) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.JsonEdit = factory(require, $, $ui, JsonEdit,
                                            JsonSchema, NsGen, JSON, Dust));
        });
    } else {
        // Browser globals
        root.JsonEdit = factory(root.require, root.$, root.$, root.JsonEdit,
                                root.JsonSchema, root.NsGen, root.JSON,
                                root.dust);
    }
}(this, function (require, $, $ui, JsonEdit, JsonSchema, NsGen, JSON, Dust) {
    "use strict";
    var formatHints = JsonEdit.defaults.hintedFormatters,
        collectHints = JsonEdit.defaults.hintedCollectors;

    formatHints.array = formatHints.array || {};

    formatHints.array.summarylist = function (name, type, id, opts, required, priv, util) {
        var
            i,
            minItems,
            conf = opts["je:summarylist"],
            templateName = "summary" + (new Date()).getTime(),
            template = Dust.compile(conf.template, templateName),
            $cont,
            $list,
            editImgPath   = require.toUrl("../src/addons/summarylist/img/edit.png"),
            removeImgPath = require.toUrl("../src/addons/summarylist/img/remove.png"),
            defaultValues = opts["default"] || [],
            addButton,
            widgetChilds;

        Dust.loadSource(template);

        if (typeof opts.minItems !== "number") {
            minItems = 1;
        } else {
            minItems = opts.minItems;
        }

        // if there are more default values than minItems then use that size to
        // initialize the items
        if (defaultValues.length > minItems) {
            minItems = defaultValues.length;
        }

        function linkButton(path, alt, onClick) {
            return {
                "a": {
                    "href": "#",
                    "$click": onClick,
                    "$childs": [
                        {
                            "img": {
                                "src": path,
                                "alt": alt,
                                "title": alt
                            }
                        }
                    ]
                }
            };
        }

        function button(label, onClick) {
            return {
                "button": {
                    "$click": onClick,
                    "$childs": label
                }
            };
        }

        function collectEditItem(schema, isEdit, onEditSucceeded) {
            var
                editor = $cont.children(".summary-item-editor"),
                result = priv.collectField(name, editor, schema),
                newData = result.data;

            if (result.result.ok) {
                onEditSucceeded(newData);
                editor.remove();
                $list.show();
            } else {
                alert("error in item fields");
            }
        }

        function editItem(schema, isEdit, onEditOkClick, onEditCancelClick) {
            var
                editor = $.lego(priv.input(name, opts.items.type, id + "-item", schema, false, util)),
                buttons = {
                    "div": {
                        "class": "summary-edit-buttons",
                        "$childs": [
                            button("Ok", onEditOkClick),
                            button("Cancel", onEditCancelClick)
                        ]
                    }
                },
                cont = {
                    "div": {
                        "class": "summary-item-editor",
                        "$childs": [
                            editor,
                            buttons
                        ]
                    }
                };

            $list.hide();
            $cont.prepend($.lego(cont));
        }

        function onEditCancelClick() {
            $cont.children(".summary-item-editor").remove();
            $list.show();
        }


        function addItem(data, schema) {

            function onEditOkClick(id) {
                collectEditItem(schema, true, function (newData) {
                    var dataItem = $("#" + id);

                    // attach the new data
                    dataItem.data("data", newData);

                    // rerender the list item summary text and replace it
                    Dust.render(templateName, newData, function (err, text) {
                        dataItem.find(".summary-text").html(text);
                    });


                    util.events.array.item.edited.fire(name, newData, data, schema);
                });
            }

            function onEditClick(event, id) {
                var itemOpts = $.extend(true, {}, opts.items, {"default": data});

                editItem(itemOpts, true, function () {
                    onEditOkClick(id);
                }, onEditCancelClick);

                event.preventDefault();
            }

            function onRemoveClick(event, id) {
                $("#" + id).remove();

                util.events.array.item.removed.fire(name, data, schema);
                event.preventDefault();
            }

            Dust.render(templateName, data, function (err, text) {
                var
                    id = "summary-item-" + (new Date()).getTime(),
                    summary = {
                        "span": {
                            "class": "summary-text",
                            "$childs": text
                        }
                    },
                    editButton = linkButton(editImgPath, "edit", function (event) {
                        onEditClick(event, id);
                    }),
                    removeButton = linkButton(removeImgPath, "remove", function (event) {
                        onRemoveClick(event, id);
                    }),
                    buttonChilds = [],
                    buttons = {
                        "span": {
                            "class": "summary-buttons",
                            "$childs": buttonChilds
                        }
                    },
                    tpl = {
                        "li": {
                            "id": id,
                            "@data": data,
                            "class": "summary-item",
                            "$childs": [
                                summary,
                                buttons
                            ]
                        }
                    };

                if (conf.allowEdit !== false) {
                    buttonChilds.push(editButton);
                }

                if (conf.allowRemove !== false) {
                    buttonChilds.push(removeButton);
                }

                $list.append($.lego(tpl));
            });

        }

        function onAddClick(schema) {
            function onEditOkClick() {
                collectEditItem(schema, false, function (newData) {
                    addItem(newData, schema);
                    util.events.array.item.edited.fire(name, newData, schema);
                });
            }

            editItem(schema, true, onEditOkClick, onEditCancelClick);
        }

        util.events.rendered.add(function () {
            var i;

            $cont = $("#" + id);
            $list = $("#" + id + "-list");

            for (i = 0; i < defaultValues.length; i += 1) {
                addItem(defaultValues[i], opts.items);
            }
        });

        widgetChilds = [{
            "ul": {
                "class": "summary-list",
                "id": id + "-list",
                "$childs": []
            }
        }];

        if (conf.allowAdd !== false) {
            addButton = button("add", function () {
                onAddClick(opts.items);
            });

            widgetChilds.unshift({"div": {"style": "display: table; width: 100%; text-align: right;", "$childs": addButton}});
        }

        return {
            "div": {
                "id": id,
                "class": priv.genFieldClasses(name, opts, " ", required),
                "$childs": widgetChilds
            }
        };
    };

    collectHints.array = collectHints.array || {};

    collectHints.array.summarylist = function (key, field, schema, priv) {
        var
            data = field.find(".summary-list:first>.summary-item")
                .map(function (i, item) {
                    return $(item).data("data");
                }).toArray(),
            arrayResult = JsonSchema.validate(key, data, schema, false);

        return {result: arrayResult, data: data};
    };

    return JsonEdit;
}));
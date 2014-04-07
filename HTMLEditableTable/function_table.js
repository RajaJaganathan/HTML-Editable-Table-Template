/*
  @purpose    : HTML Editable Template Table JS Library  
  @author     : Raja Jaganathan 
  @dependency : jQuery-1.10.2, jQuery UI/Theme CSS - v1.10.3 Library and Json2.js.
*/

//Service configuration like URL info for communicating AJAX service
var SERVICE_CONFIG = {
    PERSON_URL: "person_table.php"
}

//Common Table implemented via Module Pattern
//It is helper module for person tables.

var commonTable = (function () {

    var REGEX_CONST = {
        NUMBER_ONLY: /[0-9]/,
        ALPHA_NUMBER_SPACE_COMMA_ONLY: /[0-9a-zA-Z]|\,|\.|\s/,
        ALPHA_NUMERIC_ONLY: /[0-9a-zA-Z]/,
        NUMBER_ONLY_PASTE: /^[0-9]+$/,
        ALPHA_NUMERIC_ONLY_PASTE: /^[a-z0-9]+$/i,
        ALPHA_NUMBER_SPACE_COMMA_ONLY_PASTE: /^[0-9a-zA-Z ,.]*$/,
        START_WITH_ALPHANUMERIC: /^[a-z0-9]/i
    };

    return {
        resetRowIfEdited: function (tableId, ctrlTable) {
            $("#" + tableId + " tbody tr").each(function () {
                if ($(this).hasClass("editingRow")) {
                    ctrlTable.populateOldRowValues($(this));
                    $(this).removeClass("editingRow");
                } else if ($(this).hasClass("newRow")) {
                    $(this).remove(); //To delete row locally                   
                }
            });
        },

        isUnsaveDataAvailable: function (tableId) {
            var result = false;
            $("#" + tableId + " tbody tr").each(function () {
                if ($(this).hasClass("editingRow") || $(this).hasClass("newRow")) {
                    result = true;
                    return false;
                }
            });

            return result;
        },

        isStartWithAlphaNumeric: function (value) {
            return REGEX_CONST.START_WITH_ALPHANUMERIC.test(value);
        },

        isProductIdValid: function (productId) {
            return REGEX_CONST.ALPHA_NUMERIC_ONLY_PASTE.test(productId);
        },

        isCustomerIdValid: function (customerId) {
            return REGEX_CONST.NUMBER_ONLY_PASTE.test(customerId);
        },

        validateCommon: function (evt, regex) {
            var theEvent = evt || window.event;
            var key = theEvent.keyCode || theEvent.which;
            key = String.fromCharCode(key);

            if (!regex.test(key)) {
                theEvent.returnValue = false;
                if (theEvent.preventDefault) theEvent.preventDefault();
            }
        },

        validateNumber: function (evt) {
            commonTable.validateCommon(evt, REGEX_CONST.NUMBER_ONLY);
        },

        validateAlphaNumberSpaceComma: function (evt) {
            commonTable.validateCommon(evt, REGEX_CONST.ALPHA_NUMBER_SPACE_COMMA_ONLY);
        },

        validateAlphaNumericOnly: function (evt) {
            commonTable.validateCommon(evt, REGEX_CONST.ALPHA_NUMERIC_ONLY);
        },

        pasteValidateCommon: function (evt, self, regex) {

            var _self = $(self);

            setTimeout(function () {
                var value = $(_self).val();

                if (regex.test(value) == false) {
                    if (evt.preventDefault) {
                        evt.preventDefault();
                        evt.cancelBubble = true;
                        evt.returnValue = false;
                    }
                    else {
                        evt.cancelBubble = true;
                        evt.returnValue = false;
                    }
                    //prevent blur event so avoid AJAX call when alert show but workaround done for ie 6,7,8 in Ajax service Call
                    evt.stopImmediatePropagation();

                    alert($(_self).data("paste-error-msg"));

                    $(_self).val("");

                    return false;
                }
            }, 100);
        },

        pasteNumericOnly: function (evt, self) {
            commonTable.pasteValidateCommon(evt, self, REGEX_CONST.NUMBER_ONLY_PASTE);
        },

        pasteAlphaNumericOnly: function (evt, self) {
            commonTable.pasteValidateCommon(evt, self, REGEX_CONST.ALPHA_NUMERIC_ONLY_PASTE);
        },

        pasteAlphaNumberSpaceCommaOnly: function (evt, self) {
            commonTable.pasteValidateCommon(evt, self, REGEX_CONST.ALPHA_NUMBER_SPACE_COMMA_ONLY_PASTE);
        },

        getValidateAlphaNumericHTMLTag: function () {
            return "onkeypress = 'commonTable.validateAlphaNumericOnly(event)'";
        },

        getValidateAlphaNumberSpaceCommaHTMLTag: function () {
            return "onkeypress = 'commonTable.validateAlphaNumberSpaceComma(event)'";
        },

        getValidateNumberHTMLTag: function () {
            return "onkeypress = 'commonTable.validateNumber(event)'";
        },

        isNewRowInLastRow: function (tableId) {
            return $("#" + tableId + " tbody tr:last").hasClass("newRow");
        },

        setFocusWhenAddNewRow: function (tableId) {
            $("#" + tableId + " tbody tr:last td:first").children("input[type='text']").focus();
        },

        removeAllValidationErrorMsg: function () {
            $("#server-validation-summary span").text("");
            $("#validation-list").empty();
        },

        addValidationErrorMsg: function (errorMsg) {
            $("#validation-list").append("<li>" + errorMsg + "</li>");
        },

        //Select Combobox by Text Contains instead of value
        selectCompByText: function (selectCompName, matchText) {
            $('#' + selectCompName + ' option').each(function () {
                if ($(this).text() == matchText) {
                    $(this).attr('selected', 'selected');
                    return false;
                }
            });
        },

        //IE 6,7,8 to update alternative row color.
        updateTableRowOddEvenColor: function (tableId) {
            $("#" + tableId + " tbody tr:even").addClass("ie-tr-even-background-fix");
            $("#" + tableId + " tbody tr:odd").addClass("ie-tr-odd-background-fix");
        },

        updateNonEditableBGColor: function () {

            $('.disabled').each(function (i, elem) {
                elem.style.backgroundColor = "#D8D7D7";
                elem.style.color = "#000000";
            });

            $('.disabled').on("focus", function (e) {
                e.preventDefault();
                $(this).blur();
                return false;
            });

        }
    };
})();

/*********************************************** Person Table ***********************************************************************/
//Person Table functionality implemented via Module Pattern in Javascript
//This module contains all functionality for person table operations like adding newrow/editing/delete and validating fields.
//

var personTable = (function () {

    //Values populated in init()
    var professionSelectBox;

    var personConfig = {
        tableId: "tblPerson",
        tickElement: "<img src='tick.png' class='btnSaveIcon btnSave'>",
        clearElement: "<img src='clear.png' class='btnClearIcon btnClear'/>",
        textInputNumber4MaxCharElement: "<input type='text' name='personName' id='personName'" + commonTable.getValidateAlphaNumericHTMLTag() + "/>",
        textInputNumber2MaxCharElement: "<input type='text' name='personAge' id='personAge'" + commonTable.getValidateNumberHTMLTag() + "/>",
        datePickerElement: "<input type='text' name='personDateOfBirth' id='datepickerDob' class='disablePaste' readonly='readonly'>",
        editElement: "<img src='pencil.png' class='editicon btnEdit'/>",
        deleteElement: "<img src='delete.png' class='deleteIcon btnDelete'/>"
    };

    var VALIDATION_CONST = {
        enterName: { msg: "Name Field : Please enter the name", errorField: 'name' },
        enterAge: { msg: "Age Field : Please enter the age", errorField: 'age' },
        enterProfession: { msg: "Profession Field : Please enter number for Profession", errorField: 'profession' },
        dateOfBith: { msg: "Date of Birth Field : Please pick the date of birth", errorField: 'dateOfBith' }
    };

    var PASTE_ERROR_MSG = {
        week: "data-paste-error-msg = 'Week field contains invalid value'",
        year: "data-paste-error-msg = 'Year field contains invalid value'"
    };

    function getTDObj(par) {
        var tdObj = {};
        tdObj.tdName = par.children("td:nth-child(1)");
        tdObj.tdAge = par.children("td:nth-child(2)");
        tdObj.tdProfession = par.children("td:nth-child(3)");
        tdObj.tdDateOfBirth = par.children("td:nth-child(4)");
        tdObj.tdEdit = par.children("td:nth-child(5)");
        tdObj.tdDelete = par.children("td:nth-child(6)");
        tdObj.personId = par.children("td:nth-child(7)").children("input:text").val();
        return tdObj;
    }

    function getTDValues(td) {
        var tdValues = {};
        tdValues.name = td.tdName.html();
        tdValues.age = td.tdAge.html();
        tdValues.profession = td.tdProfession.html();
        tdValues.dateOfBith = td.tdDateOfBirth.html();
        tdValues.personId = td.personId;
        return tdValues;
    }

    function isValid(rowObj, td) {

        var errorMsg = [];

        commonTable.removeAllValidationErrorMsg();

        if (rowObj.year.length <= 0) {
            errorMsg.push(VALIDATION_CONST.enterYear);
        }
        else if (rowObj.age.length <= 0) {
            errorMsg.push(VALIDATION_CONST.enterWeek);
        }
        else {

            if (isNaN(rowObj.age)) {
                errorMsg.push(VALIDATION_CONST.ageNumOnly);
            }

            if (rowObj.age <= 0 || rowObj.age >= 100) {
                errorMsg.push(VALIDATION_CONST.learYearWeek);
            }
        }

        if (rowObj.dateOfBith.length <= 0) {
            errorMsg.push(VALIDATION_CONST.dateOfBith);
        }

        for (var i = 0; i < errorMsg.length ; i++) {
            commonTable.addValidationErrorMsg(errorMsg[i].msg);
        }

        applyValidationBackgroundColor(errorMsg, td);

        return errorMsg.length > 0 ? false : true;
    }

    function applyValidationBackgroundColor(errorMsg, td) {

        var isYearErrorFree = true;
        var isWeekErrorFree = true;
        var isdateOfBithErrorFree = true;

        for (var i = 0; i < errorMsg.length ; i++) {

            var field = errorMsg[i].errorField;

            if (field == 'name')
                isYearErrorFree = false;
            else if (field == 'week')
                isWeekErrorFree = false;
            else if (field == 'dateOfBith')
                isdateOfBithErrorFree = false;
        }

        if (isYearErrorFree)
            td.tdName.children("input:text").css("background-color", "");
        else
            td.tdName.children("input:text").css("background-color", "#fef1ec");

        if (isWeekErrorFree)
            td.tdAge.children("input:text").css("background-color", "");
        else
            td.tdAge.children("input:text").css("background-color", "#fef1ec");

        if (isdateOfBithErrorFree)
            td.tdDateOfBirth.children("input:text").css("background-color", "");
        else
            td.tdDateOfBirth.children("input:text").css("background-color", "#fef1ec");
    }

    function deleteById(tdValues, $par, $dialogUI) {
        $("#personTempId").attr("value", tdValues.personId);
        $("#btnsubmit1").attr("value", "Delete");
        $("#inclusionRowForm").submit();
        $par.remove();
        $dialogUI.dialog("close");
        //commonTable.updateTableRowOddEvenColor();
    }

    return {

        tableId: personConfig.tableId,

        newEmptyRow: "<tr class='newRow'>" +
               "<td></td>" +
               "<td></td>" +
               "<td>" + professionSelectBox + "</td>" +
               "<td></td>" +
               "<td class='td-center-align'>" + personConfig.tickElement + personConfig.clearElement + "</td>" +
               "<td class='td-center-align'></td>" +
               "</tr>",

        updateDatePickerField: function () {
            $("#datepickerDob").datepicker({
                changeMonth: false,
                changeYear: false,
                numberOfMonths: 1,
                showOn: "button",
                buttonImage: "calendar.gif",
                buttonImageOnly: true,
                minDate: 0,
                onSelect: function (dat, inst) {
                    var week = $.datepicker.iso8601Week(new Date(dat));
                    //console.log(" Week number " + $.datepicker.formatDate('yy-', new Date(dat)) + (week < 10 ? '0' : '') + week);
                }
            });
        },

        updateRowChanges: function () {

            $("input.allowNumberOnly").unbind("paste");

            $("input.allowNumberOnly").bind("paste", function (e) {
                commonTable.pasteNumericOnly(e, $(this));
            });

            personTable.updateDatePickerField();
            personTable.setToolTipText();
            commonTable.updateTableRowOddEvenColor(personTable.tableId);
        },

        addHandler: function (event) {

            event.preventDefault();

            commonTable.removeAllValidationErrorMsg();

            if (commonTable.isNewRowInLastRow(personConfig.tableId))
                return;

            commonTable.resetRowIfEdited(personConfig.tableId, personTable);

            var newRow = "<tr class='newRow'>" +
				"<td><input type='text' class='allowAlphaNumberOnly' " + commonTable.getValidateAlphaNumericHTMLTag() + "/></td>" +
                "<td><input type='text' maxlength='2' class='allowNumberOnly' " + commonTable.getValidateNumberHTMLTag() + "/></td>" +
                "<td>" + professionSelectBox + "</td>" +
				"<td>" + personConfig.datePickerElement + "</td>" +
				"<td class='td-center-align'>" + personConfig.tickElement + personConfig.clearElement + "</td>" +
				"<td class='td-center-align'></td>" +
				"<td style='display:none'></td>" +
				"</tr>";

            $("#tblPerson tbody").append(newRow);

            $("#tblPerson-scroll").animate({ scrollTop: $('#tblPerson-scroll')[0].scrollHeight }, 10);

            personTable.updateRowChanges();

            commonTable.setFocusWhenAddNewRow(personConfig.tableId);

            $("#btnsubmit1").attr("value", "Insert");

            return false;
        },

        editHandler: function (event, onloadObj) {

            event.preventDefault();

            if (typeof onloadObj == "undefined") {
                commonTable.removeAllValidationErrorMsg();
            }

            commonTable.resetRowIfEdited(personConfig.tableId, personTable);

            var par = $(this).closest("tr");
            var td = getTDObj(par);
            var tdValues = getTDValues(td);

            par.addClass("editingRow");

            personTable.setEditableAndValue(td, tdValues, tdValues /*same*/);

            personTable.updateRowChanges();

            $("#btnsubmit1").attr("value", "Update");
        },

        setEditableAndValue: function (td, tdValues, tdOldValues) {

            "use strict";

            console.log("tdValues " + tdValues);

            td.tdName.html("<input type='text' class='allowNumberOnly' "
                + PASTE_ERROR_MSG.year
                + commonTable.getValidateAlphaNumericHTMLTag() + " value='" + tdValues.name + "'/>");

            td.tdAge.html("<input type='text' maxlength='2' class='allowNumberOnly' "
                + PASTE_ERROR_MSG.age
                + commonTable.getValidateAlphaNumericHTMLTag() + " value='" + tdValues.age + "'/>");

            td.tdProfession.html(professionSelectBox);

            td.tdDateOfBirth.html("<input type='text' id='datepickerDob' class='disablePaste' readonly='readonly' value='" + tdValues.dateOfBith + "'/>");

            td.tdEdit.html(personConfig.tickElement + personConfig.clearElement);

            //Save current value in oldValue attr
            td.tdName.children("input:text").attr("oldValue", tdOldValues.name);
            td.tdAge.children("input:text").attr("oldValue", tdOldValues.age);
            td.tdProfession.children("#professionSelectBox").attr("oldValue", tdOldVlaues.profession);
            td.tdDateOfBirth.children("input:text").attr("oldValue", tdOldValues.dateOfBith);
        },

        saveHandler: function () {
            var par = $(this).closest("tr");
            var td = getTDObj(par);

            //Clear server validation msg
            $("#server-validation-summary span").html("");

            var name = $.trim(td.tdName.children("input:text").val());
            var age = $.trim(td.tdAge.children("input:text").val());
            var profession = $.trim($("#professionSelectBox option:selected").text());
            var dateOfBith = $.trim(td.tdDateOfBirth.children("input:text").val());

            var rowObj = {};
            rowObj.year = name;
            rowObj.age = age;
            rowObj.profession = profession;
            rowObj.dateOfBith = dateOfBith;

            if (!isValid(rowObj, td))
                return;

            td.tdName.html(name);
            td.tdAge.html(age);
            td.tdProfession.html(profession);
            td.tdDateOfBirth.html(dateOfBith);
            td.tdEdit.html(personConfig.editElement);
            td.tdDelete.html(personConfig.deleteElement);

            //Clear class for mark as not a new row.
            par.removeClass('newRow editingRow');

            personTable.setToolTipText();
        },

        deleteHandler: function () {
            var par = $(this).closest("tr");
            var td = getTDObj(par);

            $("#delete-dialog-confirm").dialog({
                resizable: false,
                height: 140,
                modal: true,
                autoOpen: false,
                buttons: {
                    OK: function () {
                        commonTable.removeAllValidationErrorMsg();
                        deleteById(td, par, $(this));
                    },
                    Cancel: function () {
                        $(this).dialog("close");
                    }
                }
            });

            $("#delete-dialog-confirm").dialog("open");
            $(".ui-dialog-buttonset :button:last").focus();
        },

        clearHandler: function () {

            var par = $(this).closest("tr");

            commonTable.removeAllValidationErrorMsg();

            if (par.hasClass("newRow")) {
                par.remove();
            } else {
                //Reset with old value
                personTable.populateOldRowValues(par);
            }
        },

        clearAllRowField: function (par) {
            var td = getTDObj(par);
            td.tdName.html(td.tdName.children("input:text").val(""));
            td.tdAge.html(td.tdAge.children("input:text").val(""));
            td.tdProfession.html(td.tdProfession.children("input:text").val(""));
            td.tdDateOfBirth.html(td.tdDateOfBirth.children("input:text").val(""));

            //Reapply picker img
            td.tdDateOfBirth.children("input:text").removeClass("hasDatepicker");
            personTable.updateRowChanges();
        },

        populateOldRowValues: function (currentTR) {
            var td = getTDObj(currentTR);
            td.tdName.html(td.tdName.children("input:text").attr("oldValue"));
            td.tdAge.html(td.tdAge.children("input:text").attr("oldValue"));
            td.tdProfession.html(td.tdProfession.children("input:text").attr("oldValue"));
            td.tdDateOfBirth.html(td.tdDateOfBirth.children("input:text").attr("oldValue"));
            td.tdEdit.html(personConfig.editElement);
            td.tdDelete.html(personConfig.deleteElement);

            //Clear class for mark as not a new row.
            currentTR.removeClass('newRow editingRow');

            personTable.setToolTipText();
        },

        setToolTipText: function () {
            $(".btnEdit").attr('title', "Edit");
            $(".btnDelete").attr('title', "Delete");
            $(".btnSave").attr('title', "Save");
            $(".btnClear").attr('title', "Clear");
        },

        maintainEditableIfNeeded: function () {

            var isAlreadyRowExits = $("#personExistID").val() == 1,
                isExistForNewRow = (isAlreadyRowExits && $("#btnsubmit1").val() == "insert"),
                isEditingRowExists = (isAlreadyRowExits && $("#btnsubmit1").val() == "updte"),
                tdNewValues = {},
                tdOldValues = {};

            if (isExistForNewRow || isEditingRowExists) {
                tdNewValues.year = $("#personTempName").val();
                tdNewValues.age = $("#personTempAge").val();
                tdNewValues.dateOfBith = $("#personTempDateOfBirth").val();
            }

            if (isExistForNewRow) {
                $("#" + personConfig.tableId + " tbody").append(personTable.newEmptyRow);
                var tr = $("#" + personConfig.tableId + " tbody tr:last");
                tr.addClass("newRow");
                var td = getTDObj(tr);
                personTable.setEditableAndValue(td, tdNewValues, tdNewValues);
            }
            else if (isEditingRowExists) {
                var personId = $("#personTempId").val();
                var tr = $("#" + personConfig.tableId + " tbody tr");

                tr.each(function () {
                    var td = getTDObj($(this));
                    if (td.personId == personId) {
                        tdOldValues = getTDValues(td);
                        td.tdEdit.find(".editicon").trigger("click", { onload: true });
                        personTable.setEditableAndValue(td, tdNewValues, tdOldValues);
                        return false;
                    }
                });
            }
        },

        hideAjaxLoader: function () {
            $('#ajax-loading-modal').hide();  // show loading indicator
        },

        showAjaxLoader: function () {
            $('#ajax-loading-modal').show();  // hide loading indicator
        },

        init: function () {

            $("#delete-dialog-confirm").dialog({ autoOpen: false }); // to hide from html page
            $("#move-another-page-dialog-confirm").dialog({ autoOpen: false }); // to hide from html page

            //Global AJAX Event setup for all service calls
            $(document).ajaxStart(function () {
                personTable.showAjaxLoader();
            });

            $(document).ajaxStop(function () {
                personTable.hideAjaxLoader();
            });

            professionSelectBox = $("#professionSelectOriginal").clone().removeClass('hidden')
                .attr("name", "professionSelectBox")
                .attr("id", "professionSelectBox")
                .wrap('<div/>').parent().html();

            $("#btnAdd").bind("click", personTable.addHandler);

            $(document).on("click", '.btnSaveIcon', personTable.saveHandler);
            $(document).on("click", '.btnClearIcon', personTable.clearHandler);
            $(document).on("click", '.editicon', personTable.editHandler);
            $(document).on("click", '.deleteIcon', personTable.deleteHandler);

            personTable.maintainEditableIfNeeded();

            personTable.updateRowChanges();
        }
    }//end of return		
}());      //End of personTable

//JQuery onReady function
$(function () {
    personTable.init();
});
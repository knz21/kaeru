var $target = $('#ta_target');
var KEY_PREFIX_SAVE = 'kaeru_save_';
var KEY_AUTO_SAVE = 'kaeru_auto_save';
var HISTORY_SIZE = 20;
var localHistory = [];
var historyIndex = 0;
var BACKUP_FILE_PREFIX = 'kaeru_backup_';
var BACKUP_SEPARATOR = '\n\n\n---------------------\n\n\n';
var MIN_CHILD_HEIGHT = 72;
var MIN_CHILD_WIDTH = 160;
var TAB = '\t';
var FIREBASE_BUCKET = 'kaeru_uploads';
var FIREBASE_FILE_NAMES_PATH = FIREBASE_BUCKET + '/filenames/';
var FIREBASE_TEXT = 'kaeru_text';
var actionsOnSelectedTab = [];
var fileNamesRef;
var fileNameMap = {};
var isReceiverModified = false;

(function () {
    bindActions();
    bindActionOnSelectTab();
    loadLocalStorage();
    startAutoSave();
    catchRedirectAuth();
})();

function bindActions() {
    bind('#b_undo', undoAction);
    bind('#b_redo', redoAction);
    bind('#b_copy', copyAction);
    bind('#b_save', saveAction);
    bindWithHistory('#b_clear', clearAction);
    bind('#b_wrap', wrapAction);
    bind('#b_default', defaultAction);
    bind('#b_fit', fitAction);
    bind('#b_deleteAll', deleteAllAction);
    bind('#b_text_update', updateTextAction);
    bind('#b_reload_receiver', receiveTextAction);
    bindWithHistory('#b_receiver_to_target', receiverToTargetAction);
    bind('#a_logout_firebase', logoutFirebaseAction);
    bind('.tab_button', switchTabContentAction);
    var $saveArea = $('#save_area');
    $saveArea.on('click', '.b_saveChild', childSaveAction);
    $saveArea.on('click', '.b_restoreChild', childRestoreAction);
    $saveArea.on('click', '.b_copyChild', childCopyAction);
    $saveArea.on('click', '.b_updateChild', childUpdateAction);
    $saveArea.on('click', '.b_deleteChild', childDeleteAction);
    $saveArea.on('click', '.b_reduceChild', childReduceAction);
    $saveArea.on('click', '.b_expandChild', childExpandAction);
    bind('#b_countLetter', countLetterAction);
    bind('#b_countRow', countRowAction);
    bindWithHistory('#b_upper', upperAction);
    bindWithHistory('#b_lower', lowerAction);
    bindWithHistory('#b_initcap', initcapAction);
    bindWithHistory('#b_prefix', prefixAction);
    bindWithHistory('#b_suffix', suffixAction);
    bindWithHistory('#b_delHead1', deleteFromHeadSingleAction);
    bindWithHistory('#b_delHead', deleteFromHeadAction);
    bindWithHistory('#b_delTail', deleteFromTailAction);
    bindWithHistory('#b_delTail1', deleteFromTailSingleAction);
    bindWithHistory('#b_cutHead', cutFromHeadAction);
    bindWithHistory('#b_cutHeadWithVal', cutFromHeadWithValueAction);
    bindWithHistory('#b_cutTailWithVal', cutFromTailWithValueAction);
    bindWithHistory('#b_cutTail', cutFromTailAction);
    bindWithHistory('#b_replace', replaceAction);
    bindWithHistory('#b_replaceRegex', replaceRegexAction);
    bindWithHistory('#b_trimLeft', trimLeftAction);
    bindWithHistory('#b_trim', trimAction);
    bindWithHistory('#b_trimRight', trimRightAction);
    bindWithHistory('#b_distinct', distinctAction);
    bindWithHistory('#b_duplication', duplicationAction);
    bindWithHistory('#b_single', singleAction);
    bindWithHistory('#b_sortAsc', sortAscAction);
    bindWithHistory('#b_sortDesc', sortDescAction);
    bindWithHistory('#b_sortByLengthAsc', sortByLengthAscAction);
    bindWithHistory('#b_sortByLengthDesc', sortByLengthDescAction);
    bindWithHistory('#b_reverseRow', reverseRowAction);
    bindWithHistory('#b_reverseCol', reverseColAction);
    bindWithHistory('#b_closeUp', closeUpAction);
    bindWithHistory('#b_incHead', includeHeadAction);
    bindWithHistory('#b_incAny', includeAnyAction);
    bindWithHistory('#b_incTail', includeTailAction);
    bindWithHistory('#b_notIncHead', notIncludeHeadAction);
    bindWithHistory('#b_notIncAny', notIncludeAnyAction);
    bindWithHistory('#b_notIncTail', notIncludeTailAction);
    bindWithHistory('#b_join', joinAction);
    bindWithHistory('#b_split', splitAction);
    bindWithHistory('#b_break', breakAction);
    bindWithHistory('#b_order', orderAction);
    bindWithHistory('#b_lorem', addLoremAction);
    bindWithHistory('#b_toCamel', toCamelAction);
    bindWithHistory('#b_toSnake', toSnakeAction);
    bindWithHistory('#b_multiReplace', multiReplaceAction);
    bindWithHistory('#b_multiReplaceRegex', multiReplaceRegexAction);
    bind('#b_password', passwordAction);
    bind('#b_sequence', sequenceAction);
    bind('#b_draw', drawAction);
    bind('#b_color_trial', colorTrialAction);
    bind('#b_lgtm', lgtmAction);
    bind('#b_copy_lgtm', copyLgtmAction);
    bind('.b_cymbalForward', cymbalForwardAction);
    bind('.b_cymbalBack', cymbalBackAction);
    bind('#b_backup', backupAction);
    $('#ta_target').on('keydown', inputTabAction);
    $('#c_lgtm_300px').on('change', toggleWidth);
    $('#f_import').on('change', importBackup);
    $('#ta_receiver').on('change', receiverModified);
    $('#b_firebase_storage_upload').on('change', uploadToFirebaseStorage);
    $target.on('dragover', handleDragOver).on('drop', handleFileDrop(setTarget));
    $('#download_files').on('click', '.a_delete_file', deleteStorageFile)
}

//firstTime>>

function bindWithHistory(id, func) {
    innerBind(id, setSaveHistory(func))
}

function bind(id, func) {
    innerBind(id, func);
}

function innerBind(id, func) {
    $(id).on('click', func);
}

function setSaveHistory(func) {
    return function (event) {
        if (localHistory.length == 0) {
            localHistory.push($target.val());
        }
        func(event);
        if (historyIndex < localHistory.length - 1) {
            localHistory = localHistory.slice(0, historyIndex + 1);
        }
        localHistory.push($target.val());
        if (localHistory.length > HISTORY_SIZE) {
            localHistory.shift();
        } else {
            historyIndex++;
        }
    }
}

function bindActionOnSelectTab() {
    var idx = 0;
    actionsOnSelectedTab[idx++] = onFunctionsSelected;
    actionsOnSelectedTab[idx++] = onLocalSelected;
    actionsOnSelectedTab[idx++] = onRemoteSelected;
    actionsOnSelectedTab[idx] = onOthersSelected;
}

function loadLocalStorage() {
    load();
}

function startAutoSave() {
    setInterval(function () {
        autoSave($target.val());
    }, 60000);
}

function catchRedirectAuth() {
    getRedirectAuth(function () {
        $('#t_remote').click();
    });
}

//firstTime<<

function getTargetArray() {
    return getArrayFromTextArea($target);
}

function getArrayFromTextArea($textArea) {
    return $textArea.val().split('\n');
}

function setTarget(result) {
    $target.val(result);
}

function getVal(selector) {
    return $(selector).val();
}

function getChecked(selector) {
    return $(selector).prop('checked');
}

function execModify(ary, proc) {
    ary.forEach(function (val, idx, thisAry) {
        ary[idx] = proc(val);
    });
    return ary;
}

function execFilter(ary, proc) {
    return ary.filter(proc);
}

function execSort(ary, isAsc) {
    return ary.sort(function (a, b) {
        if (a.toString() < b.toString()) {
            return isAsc ? -1 : 1;
        } else {
            return isAsc ? 1 : -1;
        }
    });
}

function execSortByLength(ary, isAsc) {
    return ary.sort(function (a, b) {
        if (a.toString().length < b.toString().length) {
            return isAsc ? -1 : 1;
        } else {
            return isAsc ? 1 : -1;
        }
    });
}

function execReverse(ary) {
    return ary.reverse();
}

function execBreak(ary, proc) {
    var newAry = [];
    ary.forEach(function (val, idx, thisAry) {
        newAry = newAry.concat(proc(val));
    });
    return newAry;
}

function convert(ary) {
    return ary.join('\n');
}

function executeModify(proc) {
    setTarget(convert(execModify(getTargetArray(), proc)));
}

function executeFilter(proc) {
    setTarget(convert(execFilter(getTargetArray(), proc)));
}

function executeSort(isAsc) {
    setTarget(convert(execSort(getTargetArray(), isAsc)));
}

function executeSortByLength(isAsc) {
    setTarget(convert(execSortByLength(getTargetArray(), isAsc)));
}

function executeReverse() {
    setTarget(convert(execReverse(getTargetArray())));
}

function executeBreak(proc) {
    setTarget(convert(execBreak(getTargetArray(), proc)));
}

//Actions>>

function undoAction() {
    if (historyIndex > 0 && historyIndex <= HISTORY_SIZE) {
        $target.val(localHistory[--historyIndex]);
    }
}

function redoAction() {
    if (historyIndex < localHistory.length - 1) {
        $target.val(localHistory[++historyIndex]);
    }
}

function copyAction() {
    setCopy($target);
}

function saveAction() {
    if ($target.val().length == 0) {
        return;
    }
    var children = $('.ta_saveChild');
    if (children.length > 0) {
        var lastChildVal = children.eq(children.length - 1).val();
        var targetVal = $target.val();
        if (lastChildVal === targetVal) {
            return;
        }
    }
    var val = $target.val();
    getNewSaveChild(save(val), val).prependTo('#save_area');
    $('#b_deleteAll').show();
}

function clearAction() {
    if ($target.val().length > 0 && confirm('Are you sure to clear text?')) {
        $target.val('');
    }
}

function wrapAction() {
    $target.attr('wrap', $target.attr('wrap') == 'off' ? 'soft' : 'off');
}

function defaultAction() {
    $target.attr('style', '')
}

function fitAction() {
    var fontSize = $target.css('font-size');
    $target.height(getTargetArray().length * (+fontSize.substr(0, fontSize.length - 2) + 14));
}

function deleteAllAction() {
    var $all = $('#save_area').find('.saveChildSet');
    if ($all.length > 0 && confirm('Are you sure to delete all?')) {
        removeAll();
        $all.remove();
        $('#b_deleteAll').hide();
    }
}

function updateTextAction() {
    isReceiverModified = false;
    sendTextMessage($('#ta_receiver').val());
    alert('Finish sending!');
}

function receiveTextAction() {
    receiveTextMessage(function (text) {
        var $receiver = $('#ta_receiver');
        if ($receiver.val().length > 0 && !confirm('Are you sure to overwrite text?')) {
            return;
        }
        $receiver.val(text);
        $('#b_reload_receiver').hide();
    });
}

function receiverToTargetAction() {
    var $receiver = $('#ta_receiver');
    if ($receiver.val().length > 0 && $target.val().length > 0 && !confirm('Are you sure to overwrite text?')) {
        return;
    }
    $target.val($receiver.val());
}

function logoutFirebaseAction() {
    if (confirm('Logout?')) {
        logoutFirebase(function () {
            $('#t_local').click();
            fileNamesRef = void(0);
            $('#download_files').children().remove();
            $('#l_auth_mail').text('');
        });
    }
}

function switchTabContentAction(event) {
    var $tabs = $('.tab_button');
    var $targetTab = $(event.target);
    var targetIndex = $tabs.index($targetTab);
    $.each($tabs, function (idx, tab) {
        var $tab = $(tab);
        idx === targetIndex ? $tab.addClass('selected') : $tab.removeClass('selected');
    });
    $.each($('.tab_content'), function (idx, content) {
        var $obj = $(content);
        idx === targetIndex ? $obj.removeClass('invisible') : $obj.addClass('invisible');
    });
    var onSelectedTab = actionsOnSelectedTab[targetIndex];
    if (onSelectedTab) {
        onSelectedTab();
    }
}

function childSaveAction(event) {
    var $thisButton = $(event.target);
    var $thisTextArea = $thisButton.parent().find('.ta_saveChild');
    var thisVal = $thisTextArea.val();
    var targetVal = $target.val();
    if (thisVal !== targetVal) {
        $target.val(thisVal);
        $thisTextArea.val(targetVal);
        update($thisButton.parent().find('.h_key').val(), targetVal);
    }
}

function childRestoreAction(event) {
    var $thisButton = $(event.target);
    var $thisTextArea = $thisButton.parent().find('.ta_saveChild');
    var thisVal = $thisTextArea.val();
    var targetVal = $target.val();
    if (thisVal !== targetVal && confirm('Are you sure to overwrite text?')) {
        $target.val(thisVal);
    }
}

function childCopyAction(event) {
    var $thisButton = $(event.target);
    var $thisTextArea = $thisButton.parent().find('.ta_saveChild');
    setCopy($thisTextArea);
}

function childUpdateAction(event) {
    var $thisButton = $(event.target);
    var $thisTextArea = $thisButton.parent().find('.ta_saveChild');
    var thisVal = $thisTextArea.val();
    if (confirm('Are you sure to update?')) {
        update($thisButton.parent().find('.h_key').val(), thisVal);
    }
}

function childDeleteAction(event) {
    if (window.confirm('Are you sure to delete it?')) {
        var $thisButton = $(event.target);
        var $parent = $thisButton.parent();
        remove($parent.find('.h_key').val());
        $parent.remove();
        if ($('.saveChildSet').length === 0) {
            $('#b_deleteAll').hide();
        }
    }
}

function childReduceAction(event) {
    var $thisButton = $(event.target);
    var $thisTextArea = $thisButton.parent().find('.ta_saveChild');
    changeSize($thisTextArea, MIN_CHILD_HEIGHT, MIN_CHILD_WIDTH);
}

function childExpandAction(event) {
    var $thisButton = $(event.target);
    var $thisTextArea = $thisButton.parent().find('.ta_saveChild');
    changeSize($thisTextArea, $thisTextArea[0].scrollHeight, $thisTextArea[0].scrollWidth);
}

function countLetterAction() {
    $('#l_countLetterValue').text(getTargetArray().reduce(getRowLength, 0));

    function getRowLength(val1, val2) {
        return val1 + val2.length;
    }
}

function countRowAction() {
    $('#l_countRowValue').text(getTargetArray().length);
}

function upperAction() {
    executeModify(upperProcess);

    function upperProcess(str) {
        return str.toUpperCase();
    }
}

function lowerAction() {
    executeModify(lowerProcess);

    function lowerProcess(str) {
        return str.toLowerCase();
    }
}

function initcapAction() {
    executeModify(initcapProcess);

    function initcapProcess(str) {
        var fIdx = str.search(/([a-z]|[A-Z])/);
        if (fIdx < 0) {
            return str;
        }
        return str.substr(0, fIdx) + str[fIdx].toUpperCase() + str.substr(fIdx + 1, str.length - fIdx - 1).toLowerCase();
    }
}

function prefixAction() {
    var val = getVal('#t_fix');
    executeModify(prefixProcess);

    function prefixProcess(str) {
        return val + str;
    }
}

function suffixAction() {
    var val = getVal('#t_fix');
    executeModify(suffixProcess);

    function suffixProcess(str) {
        return str + val;
    }
}

function deleteFromHeadSingleAction() {
    executeModify(deleteFromHeadProcess);

    function deleteFromHeadProcess(str) {
        return deleteFromHead(str, 1);
    }
}

function deleteFromTailSingleAction() {
    executeModify(deleteFromTailProcess);

    function deleteFromTailProcess(str) {
        return deleteFromTail(str, 1);
    }
}

function deleteFromHeadAction() {
    var val = getVal('#t_delCount');
    executeModify(deleteFromHeadProcess);

    function deleteFromHeadProcess(str) {
        return deleteFromHead(str, val);
    }
}

function deleteFromTailAction() {
    var val = getVal('#t_delCount');
    executeModify(deleteFromTailProcess);

    function deleteFromTailProcess(str) {
        return deleteFromTail(str, val);
    }
}

function cutFromHeadAction() {
    var val = getVal('#t_cutVal');
    executeModify(cutFromHeadProcess);

    function cutFromHeadProcess(str) {
        return cutFromHead(str, val);
    }
}

function cutFromHeadWithValueAction() {
    var val = getVal('#t_cutVal');
    executeModify(cutFromHeadWithValueProcess);

    function cutFromHeadWithValueProcess(str) {
        return cutFromHeadWithValue(str, val);
    }
}

function cutFromTailAction() {
    var val = getVal('#t_cutVal');
    executeModify(cutFromTailProcess);

    function cutFromTailProcess(str) {
        return cutFromTail(str, val);
    }
}

function cutFromTailWithValueAction() {
    var val = getVal('#t_cutVal');
    executeModify(cutFromTailWithValueProcess);

    function cutFromTailWithValueProcess(str) {
        return cutFromTailWithValue(str, val);
    }
}

function replaceAction() {
    var org = getVal('#t_repOrg');
    var dest = getVal('#t_repDest');
    executeModify(replaceProcess);

    function replaceProcess(str) {
        return replaceAll(str, org, dest);
    }
}

function replaceRegexAction() {
    var org = getVal('#t_repOrg');
    var dest = getVal('#t_repDest');

    setTarget($target.val().replace(new RegExp(org, 'g'), dest));
}

function trimLeftAction() {
    executeModify(trimLeft);

    function trimLeft(str) {
        return str.replace(/^\s+/g, '');
    }
}

function trimAction() {
    executeModify(trim);

    function trim(str) {
        return str.trim();
    }
}

function trimRightAction() {
    executeModify(trimRight);

    function trimRight(str) {
        return str.replace(/\s+$/g, '');
    }
}

function distinctAction() {
    executeFilter(distinctProcess);

    function distinctProcess(str, idx, ary) {
        return ary.indexOf(str) === idx;
    }
}

function duplicationAction() {
    executeFilter(duplicationProcess);

    function duplicationProcess(str, idx, ary) {
        return ary.indexOf(str) !== ary.lastIndexOf(str);
    }
}

function singleAction() {
    executeFilter(singleProcess);

    function singleProcess(str, idx, ary) {
        return ary.indexOf(str) === ary.lastIndexOf(str);
    }
}

function sortAscAction() {
    executeSort(true);
}

function sortDescAction() {
    executeSort(false);
}

function sortByLengthAscAction() {
    executeSortByLength(true);
}

function sortByLengthDescAction() {
    executeSortByLength(false);
}

function reverseRowAction() {
    executeReverse()
}

function reverseColAction() {
    executeModify(reverse);

    function reverse(str) {
        var r = "";
        for (var i = str.length - 1; i >= 0; i--) {
            r += str[i];
        }
        return r;
    }
}

function closeUpAction() {
    executeFilter(closeUpProcess);

    function closeUpProcess(str, idx, ary) {
        return str.length > 0;
    }
}

function includeHeadAction() {
    var val = getVal('#t_incVal');
    executeFilter(includeHeadProcess);

    function includeHeadProcess(str, idx, ary) {
        return str.indexOf(val) === 0;
    }
}

function includeAnyAction() {
    var val = getVal('#t_incVal');
    executeFilter(includeAnyProcess);

    function includeAnyProcess(str, idx, ary) {
        return str.indexOf(val) > -1;
    }
}

function includeTailAction() {
    var val = getVal('#t_incVal');
    executeFilter(includeTailProcess);

    function includeTailProcess(str, idx, ary) {
        return str.lastIndexOf(val) + val.length === str.length;
    }
}

function notIncludeHeadAction() {
    var val = getVal('#t_incVal');
    executeFilter(notIncludeHeadProcess);

    function notIncludeHeadProcess(str, idx, ary) {
        return str.indexOf(val) !== 0;
    }
}

function notIncludeAnyAction() {
    var val = getVal('#t_incVal');
    executeFilter(notIncludeAnyProcess);

    function notIncludeAnyProcess(str, idx, ary) {
        return str.indexOf(val) === -1;
    }
}

function notIncludeTailAction() {
    var val = getVal('#t_incVal');
    executeFilter(notIncludeTailProcess);

    function notIncludeTailProcess(str, idx, ary) {
        return str.lastIndexOf(val) + val.length !== str.length;
    }
}

function joinAction() {
    setTarget($target.val().replace(new RegExp('\n', 'g'), getVal('#t_join')));
}

function splitAction() {
    executeBreak(splitProcess);

    function splitProcess(str) {
        return breakLine(str, getVal('#t_split_break'), true);
    }
}

function breakAction() {
    executeBreak(breakProcess);

    function breakProcess(str) {
        return breakLine(str, getVal('#t_split_break'), false);
    }
}

function breakLine(str, delimiter, isSplit) {
    var ary = str.split(delimiter);

    ary.forEach(function (val, idx) {
        ary[idx] = (!isSplit && idx < ary.length - 1) ? val + delimiter : val;
    });
    return ary;
}

function orderAction() {
    var val = getVal('#t_order');
    var targetAry = getTargetArray();
    var goalIdx = 0;
    targetAry.forEach(function (rowStr) {
        goalIdx = Math.max(goalIdx, rowStr.indexOf(val));
    });
    setTarget(convert(targetAry.map(order)));

    function order(rowStr) {
        var idx = rowStr.indexOf(val);
        if (idx < 0) {
            return rowStr;
        }
        return rowStr.substring(0, idx).concat(getSpace(goalIdx - idx), rowStr.substring(idx, rowStr.length));
    }

    function getSpace(size) {
        var space = "";
        for (var i = 0; i < size; i++) {
            space += " ";
        }
        return space;
    }
}

function addLoremAction() {
    $target.val($target.val() + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.');
}

function toCamelAction() {
    executeModify(toCamelProcess);

    function toCamelProcess(str) {
        var idx = str.indexOf('_');
        while (idx > -1) {
            str = str.substring(0, idx).concat(str.substr(idx + 1, 1).toUpperCase(), str.substring(idx + 2, str.length));
            idx = str.indexOf('_');
        }
        return str;
    }
}

function toSnakeAction() {
    executeModify(toSnakeProcess);

    function toSnakeProcess(str) {
        var regObj = new RegExp('[A-Z]+', 'g');
        var ary;
        while ((ary = regObj.exec(str)) != null) {
            str = str.substring(0, ary.index).concat('_', str.substr(ary.index, 1).toLowerCase(), str.substring(ary.index + 1, str.length));
        }
        return str;
    }
}

function multiReplaceAction() {
    multiReplace(replaceAll);
}

function multiReplaceRegexAction() {
    multiReplace(replaceAllRegex);
}

function passwordAction() {
    $('#t_password').val(generatePassword(
        getVal('#t_passwordLength'),
        getChecked('#c_passwordLower'),
        getChecked('#c_passwordUpper'),
        getChecked('#c_passwordNumber')
    ));
}

function sequenceAction() {
    var org = getVal('#t_seqOrg');
    var start = getVal('#t_seqStart');
    var step = getVal('#t_seqStep');
    var lines = getCheckedCount(getVal('#t_seqLines'));
    var token = getVal('#t_seqToken');
    if (org.length === 0
        || !(isNumber(start) && isNumber(step))
        || lines === 0) {
        return;
    }
    var result = new Array(lines);
    for (var idx = 0; idx < lines; idx++) {
        result[idx] = replaceAll(org, token, calc(start, step, idx));
    }
    $('#ta_seqResult').val(convert(result));

    function calc(start, step, idx) {
        return +start + step * idx;
    }
}

function drawAction() {
    var $ta = $('#ta_color'),
        ary = getArrayFromTextArea($ta),
        $list = $('#color_list'),
        $compList = $('#complementary_color_list');
    changeSize($ta, $ta[0].scrollHeight, $ta.width);
    $list.children().remove();
    $list.append($('<li>').text('color'));
    $list.css('background', '#ffffff');
    $compList.children().remove();
    $compList.append($('<li>').text('complementary color'));
    $compList.css('background', '#ffffff');
    ary.forEach(function (val) {
        var m = val.match(/((\d|[a-f]|[A-F]){8}|(\d|[a-f]|[A-F]){6})/);
        if (m) {
            var color = m[0],
                rgb = colorCodeToRgb(color),
                hsv = rgbToHsv(rgb[0], rgb[1], rgb[2], false);
            $list.append(
                $('<li>')
                    .attr({ style: 'background: #' + color + ';color:  #' + getValueContrastColor(color) + ';' })
                    .text('#' + color + ' RGB(' + rgb.join(',') + ') HSV(' + hsv.join(',') + ')')
            );
            var compColor = getComplementaryColor(color);
            $compList.append(
                $('<li>')
                    .attr({ style: 'background: #' + compColor + ';color:  #' + getValueContrastColor(compColor) + ';' })
                    .text('#' + compColor)
            );
        }
    });
}

function colorTrialAction() {
    $('#ta_color').val('#FF0000\n#FFFF00\n#00FF00\n#00FFFF\n#0000FF\n#FF00FF');
    drawAction();
}

function cymbalForwardAction(event) {
    var $button = $(event.target);
    cymbal($button.prev(), getForwardTarget($button), true);
}

function cymbalBackAction(event) {
    var $button = $(event.target);
    cymbal($button.prev(), getBackTarget($button), false);
}

function backupAction() {
    if (confirm('Backup save data!')) {
        downloadFile(BACKUP_FILE_PREFIX + formatDateStr(), getBackupContent());
    }
}

function lgtmAction() {
    const $progress = $('#lgtm_progress');
    const $image = $('#i_lgtm');
    $image.prop('src', '');
    $progress.show();
    fetch('lgtm')
        .then(function (response) {
            return response.text();
        })
        .then(function (body) {
            const width = getChecked('#c_lgtm_300px') ? ' width="300px"' : '';
            $('#t_lgtm').val('<img src="' + body + '" alt="LGTM"' + width + ' />');
            $image.prop('src', body);
            if (getChecked('#c_lgtm_300px')) {
                $image.width(300);
            } else {
                $image.removeAttr('style');
            }
            $progress.hide();
        });
}

function toggleWidth(change) {
    const $input = $('#t_lgtm');
    const $image = $('#i_lgtm');
    if (change.target.checked) {
        $input.val($input.val().replace(' />', ' width="300px" />'))
        $image.width(300);
    } else {
        $input.val($input.val().replace(' width="300px" />', ' />'))
        $image.removeAttr('style');
    }
}

function copyLgtmAction() {
    var input = $('#t_lgtm');
    input.attr('disabled', false);
    setCopy(input);
    input.attr('disabled', true);
}

//Actions<<

//Actions On Selected Tab>>

function onFunctionsSelected() {
}

function onLocalSelected() {
}

function onRemoteSelected() {
    firebaseAuth(function (user) {
        $('#l_auth_mail').text(user.email + ': ');
        setFileNameListener(user.uid, function (fileNames) {
            setFileNameMap(fileNames);
            renderDownloadLinks(user.uid);
        });
        setTextMessageReceiver(function (message) {
            if (isReceiverModified) {
                $('#b_reload_receiver').show();
            } else {
                $('#ta_receiver').val(message);
            }
        });
    });
}

function onOthersSelected() {
}

//Actions On Selected Tab<<

function setCopy($ta) {
    $ta.select();
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
}

function getNewSaveChild(key, val) {
    return $('<div>').attr({ class: 'child saveChildSet margin' })
        .append($('<button>').attr({ class: 'b_saveChild' }).text('^v'))
        .append($('<button>').attr({ class: 'b_restoreChild' }).text('^'))
        .append($('<br/>'))
        .append($('<button>').attr({ class: 'b_copyChild' }).text('copy'))
        .append($('<button>').attr({ class: 'b_updateChild' }).text('upd'))
        .append($('<button>').attr({ class: 'b_deleteChild' }).text('del'))
        .append($('<br/>'))
        .append($('<button>').attr({ class: 'b_reduceChild' }).text('-><-'))
        .append($('<button>').attr({ class: 'b_expandChild' }).text('<->'))
        .append($('<textarea>').attr({ class: 'ta_saveChild', wrap: 'off' }).val(val))
        .append($('<hidden>').attr({ class: 'h_key' }).val(key));
}

function getCheckedCount(count) {
    var cnt = parseInt(count);
    if (isNaN(cnt) || cnt < 0) {
        return 0;
    }
    return cnt;
}

function isNumber(num) {
    return !isNaN(parseInt(num));
}

function deleteFromHead(str, count) {
    return str.substr(getCheckedCount(count));
}

function deleteFromTail(str, count) {
    return str.substr(0, str.length - getCheckedCount(count));
}

function cutFromHead(str, val) {
    var idx = str.indexOf(val);
    if (idx < 0) {
        return str;
    }
    return str.substr(idx);
}

function cutFromHeadWithValue(str, val) {
    var idx = str.indexOf(val);
    if (idx < 0) {
        return str;
    }
    return str.substr(idx + val.length);
}

function cutFromTail(str, val) {
    var idx = str.lastIndexOf(val);
    if (idx < 0) {
        return str;
    }
    return str.substr(0, idx + val.length);
}

function cutFromTailWithValue(str, val) {
    var idx = str.lastIndexOf(val);
    if (idx < 0) {
        return str;
    }
    return str.substr(0, str.lastIndexOf(val));
}

function multiReplace(replaceFunc) {
    var tgtAry = getTargetArray();
    var orgAry = getArrayFromTextArea($('#ta_replaceOrg'));
    var destAry = getArrayFromTextArea($('#ta_replaceDest'));
    orgAry.forEach(singleOrgReplace);

    function singleOrgReplace(val, idx, ary) {
        tgtAry = execModify(tgtAry, replaceProcess);

        function replaceProcess(str) {
            return replaceFunc(str, val, destAry[idx]);
        }
    }

    setTarget(convert(tgtAry));
}

function generatePassword(length, hasLower, hasUpper, hasNumber) {
    var l = isNumber(length) && length > 0 ? length : 8,
        charSet = (hasLower ? 'abcdefghijklmnopqrstuvwxyz' : '')
            + (hasUpper ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '')
            + (hasNumber ? '0123456789' : ''),
        p = "";
    for (var i = 0, n = charSet.length; i < l; ++i) {
        p += charSet.charAt(Math.floor(Math.random() * n));
    }
    return p;
}

function replaceAll(str, org, dest) {
    return str.split(org).join(dest);
}

function replaceAllRegex(str, org, dest) {
    return str.replace(regex(), dest);

    function regex() {
        try {
            return new RegExp(org, 'g');
        } catch (e) {
        }
    }
}

function cymbal($srcTarget, $destTarget, isForward) {
    var srcAry = getArrayFromTextArea($srcTarget);
    var destAry = getArrayFromTextArea($destTarget);
    var resultAry = [];
    var lines = srcAry.length > destAry.length ? srcAry.length : destAry.length;
    for (var idx = 0; idx < lines; idx++) {
        var srcVal = srcAry[idx] || '';
        var destVal = destAry[idx] || '';
        resultAry[idx] = isForward ? (srcVal + destVal) : (destVal + srcVal);
    }
    $srcTarget.val('');
    $destTarget.val(convert(resultAry));
}

function getForwardTarget($target) {
    return $target.parent().next().find('.ta_cymbal');
}

function getBackTarget($target) {
    return $target.parent().prev().find('.ta_cymbal');
}

function downloadFile(filename, content) {
    var blob = new Blob([content], { text: 'text/plain' });
    if (window.navigator.msSaveBlob) {// IEとEdge
        window.navigator.msSaveBlob(blob, filename);
    } else {// それ以外のブラウザ
        var objectURL = window.URL.createObjectURL(blob);
        var link = document.createElement("a");
        document.body.appendChild(link);
        link.href = objectURL;
        link.download = filename;
        link.click();
        document.body.removeChild(link);
    }
}

function changeSize($target, height, width) {
    $target.height(height);
    $target.width(width);
}

function setFileNameMap(fileNames) {
    if (fileNames == null) {
        fileNameMap = {};
    } else {
        fileNameMap = fileNames;
    }
}

function renderDownloadLinks(uid) {
    var $loader = $('#firebase_loader_wrapper');
    var $fileArea = $('#download_files');
    $fileArea.children().remove();
    var keys = Object.keys(fileNameMap);
    if (keys.length == 0) {
        return;
    }
    $loader.show();
    keys.forEach(function (key) {
        var fileName = fileNameMap[key];
        getDownloadUrl(uid, fileName, function (url) {
            $fileArea.append(createDownloadLink(key, url, fileName));
            $loader.hide();
        });
    });
}

function createDownloadLink(key, url, fileName) {
    return $('<li>')
        .append($('<a>').attr({ download: fileName, href: url }).text(fileName))
        .append($('<a>').attr({ href: 'javascript:void(0)', class: 'a_delete_file' }).text('x'))
        .append($('<input>').attr({ type: 'hidden', value: key }));
}

function deleteStorageFile(e) {
    var key = $(e.target).parent().find('input').val();
    var user = getCurrentFirebaseUser();
    if (user == null) {
        alert('No user!');
        return;
    }
    var fileName = fileNameMap[key];
    if (!confirm('Are you sure to delete file?: ' + fileName)) {
        return;
    }
    deleteFile(user.uid, fileName, function () {
        deleteFileName(user.uid, key);
    });
}

function includes(obj, val) {
    if (obj == null) {
        return false;
    }
    return Object.keys(obj).some(function (key) {
        return obj[key] === val;
    });
}

function receiverModified() {
    isReceiverModified = true;
}

function getValueContrastColor(colorCode) {
    var rgb = colorCodeToRgb(colorCode),
        hsv = rgbToHsv(rgb[0], rgb[1], rgb[2], false),
        contrastRgb = hsvToRgb(hsv[0], hsv[1], hsv[2] > 255 / 2 ? Math.round(255 * 0.15) : Math.round(255 * 0.85));
    return rgbToColorCode(contrastRgb[0], contrastRgb[1], contrastRgb[2]);
}

function getComplementaryColor(colorCode) {
    var rgb = colorCodeToRgb(colorCode),
        max = Math.max(rgb[0], Math.max(rgb[1], rgb[2])),
        min = Math.min(rgb[0], Math.min(rgb[1], rgb[2])),
        sum = max + min;
    return colorCode.length == 8 ? colorCode.substr(0, 2) : '' + rgbToColorCode(sum - rgb[0], sum - rgb[1], sum - rgb[2]);
}

function colorCodeToRgb(colorCode) {
    if (colorCode.length != 6 && colorCode.length != 8) {
        return [];
    }
    var index = colorCode.length == 6 ? 0 : 2;
    return [
        hexToDecimal(colorCode.substr(index, 2)),
        hexToDecimal(colorCode.substr(index + 2, 2)),
        hexToDecimal(colorCode.substr(index + 4, 2))
    ];
}

function rgbToColorCode(r, g, b) {
    return decimalToHex(r) + decimalToHex(g) + decimalToHex(b);
}

function decimalToHex(decimal) {
    return decimal == 0 ? '00' : pad(decimal.toString(16));
}

function hexToDecimal(hex) {
    return parseInt(hex, 16);
}

/**
 * RGBをHSVに変換
 * @param   {Number}  r         red値   ※ 0～255 の数値
 * @param   {Number}  g         green値 ※ 0～255 の数値
 * @param   {Number}  b         blue値  ※ 0～255 の数値
 * @param   {Boolean} coneModel 円錐モデルにするか
 * @return  {Array}  [h, s, v] ※ h は 0～360の数値、s/v は 0～255 の数値
 */
function rgbToHsv(r, g, b, coneModel) {
    var h, s, v,
        max = Math.max(Math.max(r, g), b),
        min = Math.min(Math.min(r, g), b);
    // hue の計算
    if (max == min) {
        h = 0;
    } else if (max == r) {
        h = 60 * (g - b) / (max - min);
    } else if (max == g) {
        h = (60 * (b - r) / (max - min)) + 120;
    } else {
        h = (60 * (r - g) / (max - min)) + 240;
    }
    while (h < 0) {
        h += 360;
    }
    // saturation の計算
    if (coneModel) {
        // 円錐モデルの場合
        s = max - min;
    } else {
        s = max == 0 ? 0 : (max - min) / max * 255;
    }
    // value の計算
    v = max;
    return [Math.round(h), Math.round(s), Math.round(v)];
}

/**
 * HSVをRGBに変換
 * @param   {Number}  h         hue値        ※ 0～360の数値
 * @param   {Number}  s         saturation値 ※ 0～255 の数値
 * @param   {Number}  v         value値      ※ 0～255 の数値
 * @return  {Array}  [r, g, b] ※ r/g/b は 0～255 の数値
 */
function hsvToRgb(h, s, v) {
    var r, g, b;
    while (h < 0) {
        h += 360;
    }
    h = h % 360;
    if (s == 0) {
        v = Math.round(v);
        return [v, v, v];
    }
    s = s / 255;
    var i = Math.floor(h / 60) % 6,
        f = (h / 60) - i,
        p = v * (1 - s),
        q = v * (1 - f * s),
        t = v * (1 - (1 - f) * s);
    switch (i) {
        case 0 :
            r = v;
            g = t;
            b = p;
            break;
        case 1 :
            r = q;
            g = v;
            b = p;
            break;
        case 2 :
            r = p;
            g = v;
            b = t;
            break;
        case 3 :
            r = p;
            g = q;
            b = v;
            break;
        case 4 :
            r = t;
            g = p;
            b = v;
            break;
        case 5 :
            r = v;
            g = p;
            b = q;
            break;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
}

function inputTabAction(event) {
    if (event.key === "Tab") {
        event.preventDefault();
        var value = this.value;
        var sPos = this.selectionStart;
        var ePos = this.selectionEnd;
        var cPos = sPos + TAB.length;
        this.value = value.slice(0, sPos) + TAB + value.slice(ePos);
        this.setSelectionRange(cPos, cPos);
    }
}

//localStorage>>

function load() {
    var keys = [];
    for (var i = 0, cnt = localStorage.length; i < cnt; i++) {
        var key = localStorage.key(i);
        if (key.indexOf(KEY_PREFIX_SAVE) === 0) {
            keys.push(key);
        }
    }
    keys = execSort(keys, false);
    keys.forEach(function (key) {
        var child = getNewSaveChild(key, localStorage.getItem(key));
        child.appendTo('#save_area');
    });
    if (keys.length > 0) {
        $('#b_deleteAll').show();
    }
    if ($target.val() === '') {
        $target.val(localStorage.getItem(KEY_AUTO_SAVE));
    }
}

function removeAll() {
    for (var i = localStorage.length; i > 0;) {
        var key = localStorage.key(--i);
        if (key.indexOf(KEY_PREFIX_SAVE) === 0) {
            remove(key);
        }
    }
}

function autoSave(val) {
    localStorage.setItem(KEY_AUTO_SAVE, val);
}

function save(val) {
    var key = KEY_PREFIX_SAVE + +new Date() + randomNumber(16);
    localStorage.setItem(key, val);
    return key;
}

function update(key, val) {
    localStorage.setItem(key, val);
}

function remove(key) {
    localStorage.removeItem(key);
}

function getBackupContent() {
    var content = '';
    for (var i = 0, cnt = localStorage.length; i < cnt; i++) {
        var key = localStorage.key(i);
        if (key.indexOf(KEY_PREFIX_SAVE) === 0) {
            content += (content === '' ? '' : BACKUP_SEPARATOR) + localStorage.getItem(key);
        }
    }
    return content;
}

function isSaved(text) {
    for (var i = 0, cnt = localStorage.length; i < cnt; i++) {
        var key = localStorage.key(i);
        if (key.indexOf(KEY_PREFIX_SAVE) === 0 && localStorage.getItem(key) === text) {
            return true;
        }
    }
    return false;
}

//localStorage<<

//Date>>

function formatDateStr() {
    var date = new Date();
    return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate())
        + pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds()) + pad(date.getMilliseconds(), 3);
}

function pad(num, digit) {
    var _digit = digit || 2;
    for (var i = 1; i < _digit; i++) {
        if (num < Math.pow(10, i)) {
            return getZero(_digit - i) + (num + '');
        }
    }
    return num + '';
}

function getZero(num) {
    var zero = '';
    for (var i = 0; i < num; i++) {
        zero += '0';
    }
    return zero;
}

//Date<<

//file>>

function importBackup(e) {
    var saved = false;
    for (var i = 0, file; file = e.target.files[i]; i++) {
        if (file.name.indexOf(BACKUP_FILE_PREFIX) !== 0) {
            alert("It's not a kaeru backup file!");
        } else if (confirm('Do you import ' + file.name + '?')) {
            readFile(file, function (text) {
                text.split(BACKUP_SEPARATOR).forEach(function (data) {
                    if (!isSaved(data)) {
                        save(data);
                    }
                });
            });
            saved = true;
        }
    }
    if (saved) {
        autoSave($target.val());
        window.location.reload();
    }
}

function handleDragOver(e) {
    var _e = e.originalEvent;
    _e.stopPropagation();
    _e.preventDefault();
    _e.dataTransfer.dropEffect = 'copy';
}

function handleFileDrop(callback) {
    return function (e) {
        var _e = e.originalEvent;
        _e.stopPropagation();
        _e.preventDefault();
        readFile(_e.dataTransfer.files[0], function (text) {
            if ($target.val().length > 0 && confirm('Are you sure to overwrite text?')) {
                callback(text);
            }
        });
    }
}

function readFile(file, callback) {
    var reader = new FileReader();
    reader.onload = function () {
        callback(reader.result);
    };
    reader.readAsText(file);
}

function uploadToFirebaseStorage(e) {
    var file = e.target.files[0];
    var isOverwrite = includes(fileNameMap, file.name);
    if (isOverwrite && !confirm('Are you sure to overwrite file?: ' + file.name)) {
        return;
    }
    var user = getCurrentFirebaseUser();
    if (user == null) {
        alert('No user!');
        return;
    }
    var progress = $('#firebase_storage_progress');
    progress.val(0);
    progress.show();
    uploadFile(file, user.uid,
        function (snapshot) {
            var percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progress.val(percentage);
        },
        function (err) {
            console.log(err);
            alert('Error!');
            progress.hide();
        },
        function complete() {
            progress.val(100);
            alert('Uploaded!');
            progress.hide();
            if (!isOverwrite) {
                saveFileName(user.uid, file.name);
            }
        });
}

//file<<

//random>>

function randomNumber(length) {
    return randomStr(length, true, false, false);
}

function randomStr(length, hasNum, hasLowAlp, hasUprAlp) {
    var c = (hasNum ? '0123456789' : '')
        + (hasLowAlp ? 'abcdefghijklmnopqrstuvwxyz' : '')
        + (hasUprAlp ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '');
    var cl = c.length;
    var str = '';
    for (var i = 0; i < length; i++) {
        str += c[Math.floor(Math.random() * cl)] || '';
    }
    return str;
}

//random<<

//firebase>>

function firebaseAuth(callback) {
    var user = firebase.auth().currentUser;
    if (user != null) {
        callback(user);
        return;
    }
    autoSave($target.val());
    firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
}
function getRedirectAuth(callback) {
    firebase.auth().getRedirectResult().then(function (result) {
        if (result.credential) {
            callback();
        }
    }).catch(function (error) {
        console.log(error);
        console.log({
            errorCode: error.code,
            errorMessage: error.message,
            email: error.email,
            credential: error.credential
        });
    });
}

function getCurrentFirebaseUser() {
    return firebase.auth().currentUser;
}

function logoutFirebase(callback) {
    firebase.auth().signOut().then(callback, function (error) {
        console.log(error);
    });
}

function setFileNameListener(uid, callback) {
    if (!fileNamesRef) {
        fileNamesRef = firebase.database().ref(getFirebaseFileNamesPath(uid));
        fileNamesRef.on('value', function (snapshot) {
            callback(snapshot.val());
        });
    }
}

function uploadFile(file, uid, onStateChanged, onError, onComplete) {
    firebase.storage().ref(getFirebaseFilePath(uid, file.name)).put(file)
        .on('state_changed', onStateChanged, onError, onComplete);
}

function saveFileName(uid, fileName) {
    firebase.database().ref(getFirebaseFileNamesPath(uid)).push(fileName);
}

function deleteFile(uid, fileName, callback) {
    firebase.storage().ref(getFirebaseFilePath(uid, fileName)).delete().then(callback).catch(function (error) {
        console.log(error);
    });
}

function deleteFileName(uid, key) {
    firebase.database().ref(getFirebaseFileNamesPath(uid)).child(key).remove();
}

function getDownloadUrl(uid, fileName, callback) {
    firebase.storage().ref(getFirebaseFilePath(uid, fileName)).getDownloadURL().then(function (url) {
        callback(url);
    });
}

function getFirebaseFilePath(uid, fileName) {
    return FIREBASE_BUCKET + '/' + uid + '/' + fileName;
}

function getFirebaseFileNamesPath(uid) {
    return FIREBASE_FILE_NAMES_PATH + uid;
}

function sendTextMessage(text) {
    firebase.database().ref(FIREBASE_TEXT).set({
        message: text
    });
}

function receiveTextMessage(callback) {
    firebase.database().ref(FIREBASE_TEXT).once('value').then(function (snapshot) {
        callback(snapshot.val().message);
    });
}

function setTextMessageReceiver(callback) {
    firebase.database().ref(FIREBASE_TEXT).on('value', function (snapshot) {
        callback(snapshot.val().message);
    });
}

//firebase<<

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
var FIREBASE_BUCKET = 'kaeru_uploads';

(function () {
    bindActions();
    setCopyButton();
    setFirebaseStorageUploader();
    loadLocalStorage();
    startAutoSave();
})();

function bindActions() {
    bindWithoutHistory('#b_undo', undoAction);
    bindWithoutHistory('#b_redo', redoAction);
    bindWithoutHistory('#b_save', saveAction);
    bind('#b_clear', clearAction);
    bindWithoutHistory('#b_deleteAll', deleteAllAction);
    bindWithoutHistory('#b_fileStorage', showFileStorageAction);
    bindWithoutHistory('.tab_button', switchTabContentAction);
    //bindWithoutHistory('#b_send', sendAction);
    //bind('#b_receive', receiveAction);
    var $saveArea = $('#save_area');
    $saveArea.on('click', '.b_saveChild', childSaveAction);
    $saveArea.on('click', '.b_deleteChild', childDeleteAction);
    $saveArea.on('click', '.b_reduceChild', childReduceAction);
    $saveArea.on('click', '.b_expandChild', childExpandAction);
    bindWithoutHistory('#b_countLetter', countLetterAction);
    bindWithoutHistory('#b_countRow', countRowAction);
    bind('#b_upper', upperAction);
    bind('#b_lower', lowerAction);
    bind('#b_prefix', prefixAction);
    bind('#b_suffix', suffixAction);
    bind('#b_delHead1', deleteFromHeadSingleAction);
    bind('#b_delHead', deleteFromHeadAction);
    bind('#b_delTail', deleteFromTailAction);
    bind('#b_delTail1', deleteFromTailSingleAction);
    bind('#b_cutHead', cutFromHeadAction);
    bind('#b_cutHeadWithVal', cutFromHeadWithValueAction);
    bind('#b_cutTailWithVal', cutFromTailWithValueAction);
    bind('#b_cutTail', cutFromTailAction);
    bind('#b_replace', replaceAction);
    bind('#b_replaceRegex', replaceRegexAction);
    bind('#b_distinct', distinctAction);
    bind('#b_duplication', duplicationAction);
    bind('#b_single', singleAction);
    bind('#b_sortAsc', sortAscAction);
    bind('#b_sortDesc', sortDescAction);
    bind('#b_closeUp', closeUpAction);
    bind('#b_incHead', includeHeadAction);
    bind('#b_incAny', includeAnyAction);
    bind('#b_incTail', includeTailAction);
    bind('#b_notIncHead', notIncludeHeadAction);
    bind('#b_notIncAny', notIncludeAnyAction);
    bind('#b_notIncTail', notIncludeTailAction);
    bind('#b_single_line', singleLineAction);
    bind('#b_break', breakAction);
    bind('#b_order', orderAction);
    bind('#b_lorem', addLoremAction);
    bind('#b_toCamel', toCamelAction);
    bind('#b_toSnake', toSnakeAction);
    bind('#b_multiReplace', multiReplaceAction);
    bind('#b_multiReplaceRegex', multiReplaceRegexAction);
    bindWithoutHistory('#b_sequence', sequenceAction);
    bindWithoutHistory('.b_cymbalForward', cymbalForwardAction);
    bindWithoutHistory('.b_cymbalBack', cymbalBackAction);
    bindWithoutHistory('#b_backup', backupAction);
    $('#f_import').on('change', importBackup);
    $target
        .on('dragover', handleDragOver)
        .on('drop', handleFileDrop(setTarget));
}

//firstTime>>

function bind(id, func) {
    innerBind(id, setSaveHistory(func))
}

function bindWithoutHistory(id, func) {
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

function setCopyButton() {
    setCopy($('#b_copy'), $target);
}

function setFirebaseStorageUploader() {
    var $wrapper = $('#file_storage_wrapper');
    $wrapper.on('click', function () {
        $wrapper.hide();
    });
    var $fileStorage = $('#file_storage');
    $fileStorage.on('click', function (e) {
        e.stopPropagation();
    });
    var $uploader = $('#firebase_storage_progress');
    var $uploadButton = $('#b_firebase_storage_upload');
    $uploadButton.on('change', function (e) {
        var file = e.target.files[0];
        if (!confirm('upload file: ' + file.name)) {
            $uploadButton.val('');
            return;
        }
        saveStoragePath(file.name);
        var storageRef = firebase.storage().ref(FIREBASE_BUCKET + '/' + file.name);
        var task = storageRef.put(file);
        task.on('state_changed',
            function (snapshot) {
                var percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                $uploader.val(percentage);
            },
            function (err) {
                console.log(err);
            },
            function complete() {
                $uploadButton.val('');
                $uploader.val(0);
            });
    });
}

function saveStoragePath(fileName) {
    firebase.database().ref(FIREBASE_BUCKET).child('filenames').push(fileName);
}

function loadLocalStorage() {
    load();
}

function startAutoSave() {
    setInterval(function () {
        autoSave($target.val());
    }, 60000);
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
    getNewSaveChild(save(val), val).appendTo('#save_area');
    setChildCopyAction();
    $('#b_deleteAll').show();
}

function clearAction() {
    if ($target.val().length > 0 && window.confirm('Are you sure to clear text?')) {
        $target.val('');
    }
}

function deleteAllAction() {
    var $all = $('#save_area').find('.saveChildSet');
    if ($all.length > 0 && window.confirm('Are you sure to delete all?')) {
        removeAll();
        $all.remove();
        $('#b_deleteAll').hide();
    }
}

function showFileStorageAction() {
    $('#file_storage_wrapper').show();
    showDownloadLink();
}

function showDownloadLink() {
    firebase.database().ref(FIREBASE_BUCKET + '/filenames').once('value').then(function (snapshot) {
        var filenames = snapshot.val();
        var $fileList = $('#download_files');
        Object.keys(filenames).forEach(function (key) {
            console.log(filenames[key]);
            appendDownloadLink($fileList, filenames[key]);
        });
    });
}

function appendDownloadLink($files, fileName) {
    firebase.storage().ref(FIREBASE_BUCKET + '/' + fileName).getDownloadURL().then(function (url) {
        $files.append(createDownloadLink(url, fileName));
        $files.append('<br>');
    });
}

function createDownloadLink(url, fileName) {
    return $('<a>').attr('download', fileName).attr('href', url).text(fileName);
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
}

function sendAction() {//TODO
    //var key = $('#t_message_key').val();
    //if (key.length == 0 || $target.val().length == 0) {
    //    return;
    //}
    //$.ajax({
    //        url: 'php/send_message.php',
    //        type: 'post',
    //        dataType: 'text',
    //        data: {
    //            key: key,
    //            text: $target.val()
    //        }
    //    })
    //    .done(function () {
    //        alert('finish sending!');
    //    })
    //    .fail(function (error) {
    //        if (error && error.responseText) {
    //            alert(error.responseText);
    //        }
    //    });
}

function receiveAction() {//TODO
    //var key = $('#t_message_key').val();
    //if (key.length == 0) {
    //    return;
    //}
    //if ($target.val().length > 0 && !window.confirm('Are you sure to overwrite text?')) {
    //    return;
    //}
    //$.ajax({
    //        url: 'php/receive_message.php',
    //        type: 'post',
    //        dataType: 'text',
    //        data: {
    //            key: key
    //        }
    //    })
    //    .done(function (text) {
    //        if (text) {
    //            $target.val(text);
    //            window.scrollTo(0, 0);
    //        }
    //    })
    //    .fail(function (error) {
    //        if (error && error.responseText) {
    //            alert(error.responseText);
    //        }
    //    });
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

function singleLineAction() {
    setTarget($target.val().replace(new RegExp('\n', 'g'), ''));
}

function breakAction() {
    var val = getVal('#t_break');
    executeBreak(breakProcess);

    function breakProcess(str) {
        return execModifyForBreak(str.split(val), function (thisStr) {
            return thisStr + val;
        });

        function execModifyForBreak(ary, proc) {
            ary.forEach(function (val, idx) {
                ary[idx] = (idx < ary.length - 1) ? proc(val) : val;
            });
            return ary;
        }
    }
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

//Actions<<

function setCopy($copyBtn, $targetTa) {
    var $btnCopy = $copyBtn.get(0);
    var clip = new ZeroClipboard($btnCopy);
    clip.on("ready beforecopy", function () {
        $btnCopy.dataset.clipboardText = $targetTa.val();
    });
}

function getNewSaveChild(key, val) {
    return $('<div>').attr({ class: 'child saveChildSet margin' })
        .append($('<button>').attr({ class: 'b_saveChild' }).text('^v'))
        .append($('<button>').attr({ class: 'b_copyChild' }).text('copy'))
        .append($('<button>').attr({ class: 'b_deleteChild' }).text('delete'))
        .append($('<br/>'))
        .append($('<button>').attr({ class: 'b_reduceChild' }).text('-><-'))
        .append($('<button>').attr({ class: 'b_expandChild' }).text('<->'))
        .append($('<textarea>').attr({ class: 'ta_saveChild', wrap: 'off' }).val(val))
        .append($('<hidden>').attr({ class: 'h_key' }).val(key));
}

function setChildCopyAction() {
    var $children = $('#save_area').find('.child');
    var $lastChild = $($children.get($children.length - 1));
    setCopy($lastChild.find('.b_copyChild'), $lastChild.find('.ta_saveChild'));
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

//localStorage>>

function load() {
    for (var i = 0, cnt = localStorage.length; i < cnt; i++) {
        var key = localStorage.key(i);
        if (key.indexOf(KEY_PREFIX_SAVE) === 0) {
            var child = getNewSaveChild(key, localStorage.getItem(key));
            child.appendTo('#save_area');
            setCopy(child.find('.b_copyChild'), child.find('.ta_saveChild'));
            $('#b_deleteAll').show();
        }
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
    var key = KEY_AUTO_SAVE;
    localStorage.setItem(key, val);
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

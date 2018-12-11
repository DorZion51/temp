import $ from 'jquery';
import {start} from './code-analyzer';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let inputVector=$('#inputVector').val();
        let str =start(codeToParse,inputVector);
        //$('#parsedCode').val(JSON.stringify(parsedCode, null, 2));
        $('#parsedCode').html(str);
    });
});

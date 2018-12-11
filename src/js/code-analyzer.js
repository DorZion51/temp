import * as esprima from 'esprima';
let inputv=new Map();
let locals=new Map();
let ass=new Map();
let lines=[];
let p=0;
let helpMap=new Map();

const parseCode = (codeToParse) => {
    lines=codeToParse.split('\n');
    return esprima.parseScript(codeToParse,{loc:true});
};

function reset() {
    inputv=new Map();
    locals=new Map();
    ass=new Map();
    lines=[];
    p=0;
    helpMap=new Map();

}

function start(parsed,inputvector){
    reset();
    inputvector=parseCode(inputvector);
    parsed=parseCode(parsed);
    let func=extractFunction(parsed);
    setParams(func.params);
    setParamsInputVector(inputvector);
    funcTreatment(func.body.body);
    return write(lines);
}

function extractFunction(parsed) {
    for (let i = 0; i <parsed.body.length ; i++) {
        if(parsed.body[i].type=='FunctionDeclaration'){
            return parsed.body[i];
        }
        if(parsed.body[i].type=='VariableDeclaration'){
            setGlobals(parsed.body[i].declarations);
        }
        if(parsed.body[i].type=='ExpressionStatement'){
            expStatTreatment(parsed.body[i]);
        }
    }
}

function funcTreatment(func){
    for (let i = 0; i <func.length ; i++) {
        if(func[i].type=='VariableDeclaration'){
            lines[func[i].loc.start.line-1]='~';
            setLocals(func[i].declarations);
        }
        else if(func[i].type=='ExpressionStatement'){
            lines[func[i].loc.start.line-1]='~';
            expStatTreatment(func[i]);
        }
        else{
            statTreatment(func[i]);
        }
    }
}

function statTreatment(stat) {
    if(stat.type=='WhileStatement'){
        whlieTreatment(stat);
    }
    if(stat.type=='IfStatement'){
        ifTreatment(stat);
    }
    if(stat.type=='BlockStatement'){
        blockStatTreatment(stat);
    }
    if(stat.type=='ReturnStatement'){
        retTreatment(stat);
    }
}

function retTreatment(ret) {
    if(ret.argument.type=='Literal'){
        return ret.argument.value;
    }
    else{
        let show=checkTheOthers(ret.argument);
        lines[ret.loc.start.line-1]=lines[ret.loc.start.line-1].slice(0,ret.argument.loc.start.column)+show.replace(/\s+/g, '')+'{';
    }
}

function checkTheOthers(exp) {
    if(exp.type=='Identifier'){
        return checkMaps(exp.name);
    }
    if(exp.type=='UnaryExpression'){
        return unaryTreatment(exp);
    }
    if(exp.type=='BinaryExpression'){
        return binaryTreatment(exp);
    }
    if(exp.type=='MemberExpression'){
        return memberShipTreatment(exp);
    }
}

function ifTreatment(ifstat) {
    consequentTreatment(ifstat.consequent);
    let t=testTreatment(ifstat.test);
    

    if(evaluation(t)){
        lines[ifstat.loc.start.line-1]='@'+lines[ifstat.loc.start.line-1].slice(0,ifstat.test.loc.start.column-1)+t.replace(/\s+/g, '')+'{';
    }
    else{
        lines[ifstat.loc.start.line-1]='!'+lines[ifstat.loc.start.line-1].slice(0,ifstat.test.loc.start.column-1)+t.replace(/\s+/g, '')+'{';
    }
    if(ifstat.alternate!=null){
        statTreatment(ifstat.alternate);
    }
}

function consequentTreatment(cons) {
    if(cons.type=='BlockStatement'){
        blockStatTreatment(cons);
    }
}

function testTreatment(test) {
    return checkTheOthers(test);
}

function whlieTreatment(whil) {
    consequentTreatment(whil.body);
    let show=testTreatment(whil.test);
    lines[whil.loc.start.line-1]=lines[whil.loc.start.line-1].slice(0,whil.test.loc.start.column-1)+show.replace(/\s+/g, '')+'{';
}

function blockStatTreatment(block) {

    funcTreatment(block.body);
}

function checkMaps(id) {
    if(ass.has(id)){
        return ass.get(id);
    }
    if(locals.has(id)){
        return locals.get(id);
    }

    return id;
}

function unaryTreatment(unary) {
    return unary.operator+'('+argTreatment(unary.argument)+')';
}

function binaryTreatment(bin) {
    return '('+argTreatment(bin.left)+bin.operator+argTreatment(bin.right)+')';
}

function memberShipTreatment(member) {
    let x=member.object.name+'['+argTreatment(member.property)+']';
    x=checkMaps(x);
    return x ;
}

function memberShipSetTreatment(member) {
    let x=member.object.name+'['+argTreatment(member.property)+']';
    return x ;
}
function arrayExpLocalsTreament(name,arr) {
    for (let i = 0; i <arr.elements.length ; i++) {
        if(arr.elements[i].type=='Literal'){
            locals.set(name+'['+i+']',arr.elements[i].value);
        }
        else{
            locals.set(name+'['+i+']',checkTheOthers(arr.elements[i]));
        }
    }
}

function argTreatment(arg) {
    if(arg.type=='Literal'){
        return arg.value;
    }
    else{
        return checkTheOthers(arg);
    }
}

function setLocals(vard) {
    let left='';
    let right='';
    for (let i = 0; i <vard.length ; i++) {
        left=vard[i].id.name;
        if(vard[i].init.type=='Literal'){
            right=vard[i].init.value;
            locals.set(left,right);
        }
        else if(vard[i].init.type=='ArrayExpression'){
            arrayExpLocalsTreament(left,vard[i].init);
        }
        else{
            right=checkTheOthers(vard[i].init);
            locals.set(left,right);
        }
    }
}

function arrayExpGlobalsTreament(name,arr) {
    for (let i = 0; i <arr.elements.length ; i++) {
        if(arr.elements[i].type=='Literal'){
            inputv.set(name+'['+i+']',arr.elements[i].value);
        }
        else{
            inputv.set(name+'['+i+']',checkTheOthers(arr.elements[i]));
        }
    }
}

function setGlobals(vard) {
    let left='';
    let right='';
    for (let i = 0; i <vard.length ; i++) {
        left=vard[i].id.name;
        if(vard[i].init.type=='Literal'){
            right=vard[i].init.value;
            inputv.set(left,right);
        }
        else if(vard[i].init.type=='ArrayExpression'){
            arrayExpGlobalsTreament(left,vard[i].init);
        }
        else{
            right=checkTheOthers(vard[i].init);
            inputv.set(left,right);
        }
    }
}

function expStatTreatment(exp) {
    if(exp.expression.type=='AssignmentExpression'){
        assExpTreatment(exp.expression);
    }
}

function arrayExpAssTreament(name,arr) {
    for (let i = 0; i <arr.elements.length ; i++) {
        if(arr.elements[i].type=='Literal'){
            ass.set(name+'['+i+']',arr.elements[i].value);
        }
        else{
            ass.set(name+'['+i+']',checkTheOthers(arr.elements[i]));
        }
    }
}

function assExpTreatment(vard) {
    let left='';let right='';
    if(vard.left.type=='Identifier'){
        left=vard.left.name;
    }
    if(vard.left.type=='MemberExpression'){
        left=memberShipSetTreatment(vard.left);
    }
    if(vard.right.type=='Literal'){
        right=vard.right.value;
        ass.set(left,right);
    }
    else if(vard.right.type=='ArrayExpression'){
        arrayExpAssTreament(left,vard.right);
    }
    else{
        right=checkTheOthers(vard.right);
        ass.set(left,right);
    }
}

function setParams(params) {
    for (let i = 0; i <params.length ; i++) {
        helpMap.set(p,params[i].name);
        p++;
    }
}

function setParamsInputVector(input) {
    let exp = input.body[0].expression.expressions;
    for (let i = 0; i <exp.length ; i++) {
        if(exp[i].type=='Literal'){
            inputv.set(helpMap.get(i),exp[i].value);
        }
        if(exp[i].type=='ArrayExpression'){
            for (let j = 0; j < exp[i].elements.length; j++) {
                inputv.set(helpMap.get(i) + '[' + j + ']', exp[i].elements[j].value);
            }
        }
    }
}

//////////////
///print/////
/////////////
function write(lines) {
    let str='';
    //let strcolor=''
    for (let i = 0; i <lines.length ; i++) {
        if(lines[i]!='~'){
            str=str+forGreenRed(lines[i])+'</br>';

        }
    }
    return str;
}


function forGreenRed(line) {
    if(line.indexOf('@')==0&&!line.includes('while')){
        line=''+line.substring(1);
        line=line.split('<').join(' < ');
        return '<a style="background-color:green;">'+line.split(' ').join('&nbsp ')+'</a>';
    }
    else if(line.indexOf('!')==0&&!line.includes('while')){
        line=''+line.substring(1);
        line=line.split('<').join(' < ');
        return '<a style="background-color:red;">'+line.split(' ').join('&nbsp ')+'</a>';
    }
    else {
        return forGreenRed2(line);
    }
}

function forGreenRed2(line) {
    if(line.includes('while')){
        line=''+line.substring(1);
        line=line.split('<').join(' < ');
        return '<a>'+line.split(' ').join('&nbsp ')+'</a>';
    }
    else{
        return '<a>'+line.split(' ').join('&nbsp ')+'</a>';
    }
}

function evaluation(str) {
    let x='';
    try {
        x=eval(str);
        return x;
    }
    catch (e) {
        x=esprima.parseScript(str);
        x=x.body[0].expression;
        let t=argTreatment2(x);
        return eval(t);
    }

}

function checkTheOthers2(exp) {
    if(exp.type=='Identifier'){
        return identifier(exp);
    }
    if(exp.type=='UnaryExpression'){
        return unaryTreatment2(exp);
    }
    if(exp.type=='BinaryExpression'){
        return binaryTreatment2(exp);
    }
    if(exp.type=='MemberExpression'){
        return memberShipTreatment2(exp);
    }
}

function identifier(exp) {
    if(inputv.has(exp.name)){
        let x=inputv.get(exp.name);
        if(isNaN(x)){
            return '\''+x+'\'';
        }
        return x;
    }else{
        return '\''+exp.name+'\'';
    }
}

function argTreatment2(arg) {
    if(arg.type=='Literal'){
        return arg.value;
    }
    else{
        return checkTheOthers2(arg);
    }
}

function unaryTreatment2(unary) {
    return unary.operator+'('+argTreatment2(unary.argument)+')';
}

function binaryTreatment2(bin) {
    return '('+argTreatment2(bin.left)+bin.operator+argTreatment2(bin.right)+')';
}

function memberShipTreatment2(member) {
    let x=member.object.name+'['+argTreatment2(member.property)+']';
    x=checkMaps(x);
    if(inputv.has(x)){
        let x1=inputv.get(x);
        if(isNaN(x1)){
            return '\''+x1+'\'';
        }
        return x1;
    }
    if(isNaN(x)){
        return '\''+x+'\'';
    }
    return x;
}

export {parseCode,start};

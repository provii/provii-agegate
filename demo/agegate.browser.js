"use strict";(()=>{var Ko=Object.create;var Lr=Object.defineProperty;var Wo=Object.getOwnPropertyDescriptor;var Qo=Object.getOwnPropertyNames;var Jo=Object.getPrototypeOf,Yo=Object.prototype.hasOwnProperty;var Y=(n,e)=>()=>(e||n((e={exports:{}}).exports,e),e.exports);var Xo=(n,e,t,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of Qo(e))!Yo.call(n,i)&&i!==t&&Lr(n,i,{get:()=>e[i],enumerable:!(r=Wo(e,i))||r.enumerable});return n};var Nr=(n,e,t)=>(t=n!=null?Ko(Jo(n)):{},Xo(e||!n||!n.__esModule?Lr(t,"default",{value:n,enumerable:!0}):t,n));var Ti=Y((Hc,Ci)=>{Ci.exports=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then}});var Fe=Y(Ye=>{var Gn,Ks=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];Ye.getSymbolSize=function(e){if(!e)throw new Error('"version" cannot be null or undefined');if(e<1||e>40)throw new Error('"version" should be in range from 1 to 40');return e*4+17};Ye.getSymbolTotalCodewords=function(e){return Ks[e]};Ye.getBCHDigit=function(n){let e=0;for(;n!==0;)e++,n>>>=1;return e};Ye.setToSJISFunction=function(e){if(typeof e!="function")throw new Error('"toSJISFunc" is not a valid function.');Gn=e};Ye.isKanjiModeEnabled=function(){return typeof Gn<"u"};Ye.toSJIS=function(e){return Gn(e)}});var cn=Y(Ie=>{Ie.L={bit:1};Ie.M={bit:0};Ie.Q={bit:3};Ie.H={bit:2};function Ws(n){if(typeof n!="string")throw new Error("Param is not a string");switch(n.toLowerCase()){case"l":case"low":return Ie.L;case"m":case"medium":return Ie.M;case"q":case"quartile":return Ie.Q;case"h":case"high":return Ie.H;default:throw new Error("Unknown EC Level: "+n)}}Ie.isValid=function(e){return e&&typeof e.bit<"u"&&e.bit>=0&&e.bit<4};Ie.from=function(e,t){if(Ie.isValid(e))return e;try{return Ws(e)}catch{return t}}});var Mi=Y((Kc,ki)=>{function Ri(){this.buffer=[],this.length=0}Ri.prototype={get:function(n){let e=Math.floor(n/8);return(this.buffer[e]>>>7-n%8&1)===1},put:function(n,e){for(let t=0;t<e;t++)this.putBit((n>>>e-t-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(n){let e=Math.floor(this.length/8);this.buffer.length<=e&&this.buffer.push(0),n&&(this.buffer[e]|=128>>>this.length%8),this.length++}};ki.exports=Ri});var Oi=Y((Wc,Pi)=>{function Pt(n){if(!n||n<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=n,this.data=new Uint8Array(n*n),this.reservedBit=new Uint8Array(n*n)}Pt.prototype.set=function(n,e,t,r){let i=n*this.size+e;this.data[i]=t,r&&(this.reservedBit[i]=!0)};Pt.prototype.get=function(n,e){return this.data[n*this.size+e]};Pt.prototype.xor=function(n,e,t){this.data[n*this.size+e]^=t};Pt.prototype.isReserved=function(n,e){return this.reservedBit[n*this.size+e]};Pi.exports=Pt});var Li=Y(ln=>{var Qs=Fe().getSymbolSize;ln.getRowColCoords=function(e){if(e===1)return[];let t=Math.floor(e/7)+2,r=Qs(e),i=r===145?26:Math.ceil((r-13)/(2*t-2))*2,o=[r-7];for(let s=1;s<t-1;s++)o[s]=o[s-1]-i;return o.push(6),o.reverse()};ln.getPositions=function(e){let t=[],r=ln.getRowColCoords(e),i=r.length;for(let o=0;o<i;o++)for(let s=0;s<i;s++)o===0&&s===0||o===0&&s===i-1||o===i-1&&s===0||t.push([r[o],r[s]]);return t}});var Bi=Y(Di=>{var Js=Fe().getSymbolSize,Ni=7;Di.getPositions=function(e){let t=Js(e);return[[0,0],[t-Ni,0],[0,t-Ni]]}});var $i=Y(te=>{te.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var Xe={N1:3,N2:3,N3:40,N4:10};te.isValid=function(e){return e!=null&&e!==""&&!isNaN(e)&&e>=0&&e<=7};te.from=function(e){return te.isValid(e)?parseInt(e,10):void 0};te.getPenaltyN1=function(e){let t=e.size,r=0,i=0,o=0,s=null,l=null;for(let d=0;d<t;d++){i=o=0,s=l=null;for(let g=0;g<t;g++){let S=e.get(d,g);S===s?i++:(i>=5&&(r+=Xe.N1+(i-5)),s=S,i=1),S=e.get(g,d),S===l?o++:(o>=5&&(r+=Xe.N1+(o-5)),l=S,o=1)}i>=5&&(r+=Xe.N1+(i-5)),o>=5&&(r+=Xe.N1+(o-5))}return r};te.getPenaltyN2=function(e){let t=e.size,r=0;for(let i=0;i<t-1;i++)for(let o=0;o<t-1;o++){let s=e.get(i,o)+e.get(i,o+1)+e.get(i+1,o)+e.get(i+1,o+1);(s===4||s===0)&&r++}return r*Xe.N2};te.getPenaltyN3=function(e){let t=e.size,r=0,i=0,o=0;for(let s=0;s<t;s++){i=o=0;for(let l=0;l<t;l++)i=i<<1&2047|e.get(s,l),l>=10&&(i===1488||i===93)&&r++,o=o<<1&2047|e.get(l,s),l>=10&&(o===1488||o===93)&&r++}return r*Xe.N3};te.getPenaltyN4=function(e){let t=0,r=e.data.length;for(let o=0;o<r;o++)t+=e.data[o];return Math.abs(Math.ceil(t*100/r/5)-10)*Xe.N4};function Ys(n,e,t){switch(n){case te.Patterns.PATTERN000:return(e+t)%2===0;case te.Patterns.PATTERN001:return e%2===0;case te.Patterns.PATTERN010:return t%3===0;case te.Patterns.PATTERN011:return(e+t)%3===0;case te.Patterns.PATTERN100:return(Math.floor(e/2)+Math.floor(t/3))%2===0;case te.Patterns.PATTERN101:return e*t%2+e*t%3===0;case te.Patterns.PATTERN110:return(e*t%2+e*t%3)%2===0;case te.Patterns.PATTERN111:return(e*t%3+(e+t)%2)%2===0;default:throw new Error("bad maskPattern:"+n)}}te.applyMask=function(e,t){let r=t.size;for(let i=0;i<r;i++)for(let o=0;o<r;o++)t.isReserved(o,i)||t.xor(o,i,Ys(e,o,i))};te.getBestMask=function(e,t){let r=Object.keys(te.Patterns).length,i=0,o=1/0;for(let s=0;s<r;s++){t(s),te.applyMask(s,e);let l=te.getPenaltyN1(e)+te.getPenaltyN2(e)+te.getPenaltyN3(e)+te.getPenaltyN4(e);te.applyMask(s,e),l<o&&(o=l,i=s)}return i}});var Kn=Y(jn=>{var qe=cn(),dn=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],un=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];jn.getBlocksCount=function(e,t){switch(t){case qe.L:return dn[(e-1)*4+0];case qe.M:return dn[(e-1)*4+1];case qe.Q:return dn[(e-1)*4+2];case qe.H:return dn[(e-1)*4+3];default:return}};jn.getTotalCodewordsCount=function(e,t){switch(t){case qe.L:return un[(e-1)*4+0];case qe.M:return un[(e-1)*4+1];case qe.Q:return un[(e-1)*4+2];case qe.H:return un[(e-1)*4+3];default:return}}});var Ui=Y(fn=>{var Ot=new Uint8Array(512),hn=new Uint8Array(256);(function(){let e=1;for(let t=0;t<255;t++)Ot[t]=e,hn[e]=t,e<<=1,e&256&&(e^=285);for(let t=255;t<512;t++)Ot[t]=Ot[t-255]})();fn.log=function(e){if(e<1)throw new Error("log("+e+")");return hn[e]};fn.exp=function(e){return Ot[e]};fn.mul=function(e,t){return e===0||t===0?0:Ot[hn[e]+hn[t]]}});var Fi=Y(Lt=>{var Wn=Ui();Lt.mul=function(e,t){let r=new Uint8Array(e.length+t.length-1);for(let i=0;i<e.length;i++)for(let o=0;o<t.length;o++)r[i+o]^=Wn.mul(e[i],t[o]);return r};Lt.mod=function(e,t){let r=new Uint8Array(e);for(;r.length-t.length>=0;){let i=r[0];for(let s=0;s<t.length;s++)r[s]^=Wn.mul(t[s],i);let o=0;for(;o<r.length&&r[o]===0;)o++;r=r.slice(o)}return r};Lt.generateECPolynomial=function(e){let t=new Uint8Array([1]);for(let r=0;r<e;r++)t=Lt.mul(t,new Uint8Array([1,Wn.exp(r)]));return t}});var Vi=Y((tl,zi)=>{var qi=Fi();function Qn(n){this.genPoly=void 0,this.degree=n,this.degree&&this.initialize(this.degree)}Qn.prototype.initialize=function(e){this.degree=e,this.genPoly=qi.generateECPolynomial(this.degree)};Qn.prototype.encode=function(e){if(!this.genPoly)throw new Error("Encoder not initialized");let t=new Uint8Array(e.length+this.degree);t.set(e);let r=qi.mod(t,this.genPoly),i=this.degree-r.length;if(i>0){let o=new Uint8Array(this.degree);return o.set(r,i),o}return r};zi.exports=Qn});var Jn=Y(Hi=>{Hi.isValid=function(e){return!isNaN(e)&&e>=1&&e<=40}});var Yn=Y(Be=>{var Gi="[0-9]+",Xs="[A-Z $%*+\\-./:]+",Nt="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";Nt=Nt.replace(/u/g,"\\u");var Zs="(?:(?![A-Z0-9 $%*+\\-./:]|"+Nt+`)(?:.|[\r
]))+`;Be.KANJI=new RegExp(Nt,"g");Be.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g");Be.BYTE=new RegExp(Zs,"g");Be.NUMERIC=new RegExp(Gi,"g");Be.ALPHANUMERIC=new RegExp(Xs,"g");var ea=new RegExp("^"+Nt+"$"),ta=new RegExp("^"+Gi+"$"),na=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");Be.testKanji=function(e){return ea.test(e)};Be.testNumeric=function(e){return ta.test(e)};Be.testAlphanumeric=function(e){return na.test(e)}});var ze=Y(ce=>{var ra=Jn(),Xn=Yn();ce.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]};ce.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]};ce.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]};ce.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]};ce.MIXED={bit:-1};ce.getCharCountIndicator=function(e,t){if(!e.ccBits)throw new Error("Invalid mode: "+e);if(!ra.isValid(t))throw new Error("Invalid version: "+t);return t>=1&&t<10?e.ccBits[0]:t<27?e.ccBits[1]:e.ccBits[2]};ce.getBestModeForData=function(e){return Xn.testNumeric(e)?ce.NUMERIC:Xn.testAlphanumeric(e)?ce.ALPHANUMERIC:Xn.testKanji(e)?ce.KANJI:ce.BYTE};ce.toString=function(e){if(e&&e.id)return e.id;throw new Error("Invalid mode")};ce.isValid=function(e){return e&&e.bit&&e.ccBits};function ia(n){if(typeof n!="string")throw new Error("Param is not a string");switch(n.toLowerCase()){case"numeric":return ce.NUMERIC;case"alphanumeric":return ce.ALPHANUMERIC;case"kanji":return ce.KANJI;case"byte":return ce.BYTE;default:throw new Error("Unknown mode: "+n)}}ce.from=function(e,t){if(ce.isValid(e))return e;try{return ia(e)}catch{return t}}});var Ji=Y(Ze=>{var gn=Fe(),oa=Kn(),ji=cn(),Ve=ze(),Zn=Jn(),Wi=7973,Ki=gn.getBCHDigit(Wi);function sa(n,e,t){for(let r=1;r<=40;r++)if(e<=Ze.getCapacity(r,t,n))return r}function Qi(n,e){return Ve.getCharCountIndicator(n,e)+4}function aa(n,e){let t=0;return n.forEach(function(r){let i=Qi(r.mode,e);t+=i+r.getBitsLength()}),t}function ca(n,e){for(let t=1;t<=40;t++)if(aa(n,t)<=Ze.getCapacity(t,e,Ve.MIXED))return t}Ze.from=function(e,t){return Zn.isValid(e)?parseInt(e,10):t};Ze.getCapacity=function(e,t,r){if(!Zn.isValid(e))throw new Error("Invalid QR Code version");typeof r>"u"&&(r=Ve.BYTE);let i=gn.getSymbolTotalCodewords(e),o=oa.getTotalCodewordsCount(e,t),s=(i-o)*8;if(r===Ve.MIXED)return s;let l=s-Qi(r,e);switch(r){case Ve.NUMERIC:return Math.floor(l/10*3);case Ve.ALPHANUMERIC:return Math.floor(l/11*2);case Ve.KANJI:return Math.floor(l/13);case Ve.BYTE:default:return Math.floor(l/8)}};Ze.getBestVersionForData=function(e,t){let r,i=ji.from(t,ji.M);if(Array.isArray(e)){if(e.length>1)return ca(e,i);if(e.length===0)return 1;r=e[0]}else r=e;return sa(r.mode,r.getLength(),i)};Ze.getEncodedBits=function(e){if(!Zn.isValid(e)||e<7)throw new Error("Invalid QR Code version");let t=e<<12;for(;gn.getBCHDigit(t)-Ki>=0;)t^=Wi<<gn.getBCHDigit(t)-Ki;return e<<12|t}});var eo=Y(Zi=>{var er=Fe(),Xi=1335,la=21522,Yi=er.getBCHDigit(Xi);Zi.getEncodedBits=function(e,t){let r=e.bit<<3|t,i=r<<10;for(;er.getBCHDigit(i)-Yi>=0;)i^=Xi<<er.getBCHDigit(i)-Yi;return(r<<10|i)^la}});var no=Y((al,to)=>{var da=ze();function at(n){this.mode=da.NUMERIC,this.data=n.toString()}at.getBitsLength=function(e){return 10*Math.floor(e/3)+(e%3?e%3*3+1:0)};at.prototype.getLength=function(){return this.data.length};at.prototype.getBitsLength=function(){return at.getBitsLength(this.data.length)};at.prototype.write=function(e){let t,r,i;for(t=0;t+3<=this.data.length;t+=3)r=this.data.substr(t,3),i=parseInt(r,10),e.put(i,10);let o=this.data.length-t;o>0&&(r=this.data.substr(t),i=parseInt(r,10),e.put(i,o*3+1))};to.exports=at});var io=Y((cl,ro)=>{var ua=ze(),tr=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function ct(n){this.mode=ua.ALPHANUMERIC,this.data=n}ct.getBitsLength=function(e){return 11*Math.floor(e/2)+6*(e%2)};ct.prototype.getLength=function(){return this.data.length};ct.prototype.getBitsLength=function(){return ct.getBitsLength(this.data.length)};ct.prototype.write=function(e){let t;for(t=0;t+2<=this.data.length;t+=2){let r=tr.indexOf(this.data[t])*45;r+=tr.indexOf(this.data[t+1]),e.put(r,11)}this.data.length%2&&e.put(tr.indexOf(this.data[t]),6)};ro.exports=ct});var so=Y((ll,oo)=>{var ha=ze();function lt(n){this.mode=ha.BYTE,typeof n=="string"?this.data=new TextEncoder().encode(n):this.data=new Uint8Array(n)}lt.getBitsLength=function(e){return e*8};lt.prototype.getLength=function(){return this.data.length};lt.prototype.getBitsLength=function(){return lt.getBitsLength(this.data.length)};lt.prototype.write=function(n){for(let e=0,t=this.data.length;e<t;e++)n.put(this.data[e],8)};oo.exports=lt});var co=Y((dl,ao)=>{var fa=ze(),ga=Fe();function dt(n){this.mode=fa.KANJI,this.data=n}dt.getBitsLength=function(e){return e*13};dt.prototype.getLength=function(){return this.data.length};dt.prototype.getBitsLength=function(){return dt.getBitsLength(this.data.length)};dt.prototype.write=function(n){let e;for(e=0;e<this.data.length;e++){let t=ga.toSJIS(this.data[e]);if(t>=33088&&t<=40956)t-=33088;else if(t>=57408&&t<=60351)t-=49472;else throw new Error("Invalid SJIS character: "+this.data[e]+`
Make sure your charset is UTF-8`);t=(t>>>8&255)*192+(t&255),n.put(t,13)}};ao.exports=dt});var lo=Y((ul,nr)=>{"use strict";var Dt={single_source_shortest_paths:function(n,e,t){var r={},i={};i[e]=0;var o=Dt.PriorityQueue.make();o.push(e,0);for(var s,l,d,g,S,w,m,_,I;!o.empty();){s=o.pop(),l=s.value,g=s.cost,S=n[l]||{};for(d in S)S.hasOwnProperty(d)&&(w=S[d],m=g+w,_=i[d],I=typeof i[d]>"u",(I||_>m)&&(i[d]=m,o.push(d,m),r[d]=l))}if(typeof t<"u"&&typeof i[t]>"u"){var L=["Could not find a path from ",e," to ",t,"."].join("");throw new Error(L)}return r},extract_shortest_path_from_predecessor_list:function(n,e){for(var t=[],r=e,i;r;)t.push(r),i=n[r],r=n[r];return t.reverse(),t},find_path:function(n,e,t){var r=Dt.single_source_shortest_paths(n,e,t);return Dt.extract_shortest_path_from_predecessor_list(r,t)},PriorityQueue:{make:function(n){var e=Dt.PriorityQueue,t={},r;n=n||{};for(r in e)e.hasOwnProperty(r)&&(t[r]=e[r]);return t.queue=[],t.sorter=n.sorter||e.default_sorter,t},default_sorter:function(n,e){return n.cost-e.cost},push:function(n,e){var t={value:n,cost:e};this.queue.push(t),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};typeof nr<"u"&&(nr.exports=Dt)});var wo=Y(ut=>{var J=ze(),fo=no(),go=io(),po=so(),mo=co(),Bt=Yn(),pn=Fe(),pa=lo();function uo(n){return unescape(encodeURIComponent(n)).length}function $t(n,e,t){let r=[],i;for(;(i=n.exec(t))!==null;)r.push({data:i[0],index:i.index,mode:e,length:i[0].length});return r}function yo(n){let e=$t(Bt.NUMERIC,J.NUMERIC,n),t=$t(Bt.ALPHANUMERIC,J.ALPHANUMERIC,n),r,i;return pn.isKanjiModeEnabled()?(r=$t(Bt.BYTE,J.BYTE,n),i=$t(Bt.KANJI,J.KANJI,n)):(r=$t(Bt.BYTE_KANJI,J.BYTE,n),i=[]),e.concat(t,r,i).sort(function(s,l){return s.index-l.index}).map(function(s){return{data:s.data,mode:s.mode,length:s.length}})}function rr(n,e){switch(e){case J.NUMERIC:return fo.getBitsLength(n);case J.ALPHANUMERIC:return go.getBitsLength(n);case J.KANJI:return mo.getBitsLength(n);case J.BYTE:return po.getBitsLength(n)}}function ma(n){return n.reduce(function(e,t){let r=e.length-1>=0?e[e.length-1]:null;return r&&r.mode===t.mode?(e[e.length-1].data+=t.data,e):(e.push(t),e)},[])}function ya(n){let e=[];for(let t=0;t<n.length;t++){let r=n[t];switch(r.mode){case J.NUMERIC:e.push([r,{data:r.data,mode:J.ALPHANUMERIC,length:r.length},{data:r.data,mode:J.BYTE,length:r.length}]);break;case J.ALPHANUMERIC:e.push([r,{data:r.data,mode:J.BYTE,length:r.length}]);break;case J.KANJI:e.push([r,{data:r.data,mode:J.BYTE,length:uo(r.data)}]);break;case J.BYTE:e.push([{data:r.data,mode:J.BYTE,length:uo(r.data)}])}}return e}function wa(n,e){let t={},r={start:{}},i=["start"];for(let o=0;o<n.length;o++){let s=n[o],l=[];for(let d=0;d<s.length;d++){let g=s[d],S=""+o+d;l.push(S),t[S]={node:g,lastCount:0},r[S]={};for(let w=0;w<i.length;w++){let m=i[w];t[m]&&t[m].node.mode===g.mode?(r[m][S]=rr(t[m].lastCount+g.length,g.mode)-rr(t[m].lastCount,g.mode),t[m].lastCount+=g.length):(t[m]&&(t[m].lastCount=g.length),r[m][S]=rr(g.length,g.mode)+4+J.getCharCountIndicator(g.mode,e))}}i=l}for(let o=0;o<i.length;o++)r[i[o]].end=0;return{map:r,table:t}}function ho(n,e){let t,r=J.getBestModeForData(n);if(t=J.from(e,r),t!==J.BYTE&&t.bit<r.bit)throw new Error('"'+n+'" cannot be encoded with mode '+J.toString(t)+`.
 Suggested mode is: `+J.toString(r));switch(t===J.KANJI&&!pn.isKanjiModeEnabled()&&(t=J.BYTE),t){case J.NUMERIC:return new fo(n);case J.ALPHANUMERIC:return new go(n);case J.KANJI:return new mo(n);case J.BYTE:return new po(n)}}ut.fromArray=function(e){return e.reduce(function(t,r){return typeof r=="string"?t.push(ho(r,null)):r.data&&t.push(ho(r.data,r.mode)),t},[])};ut.fromString=function(e,t){let r=yo(e,pn.isKanjiModeEnabled()),i=ya(r),o=wa(i,t),s=pa.find_path(o.map,"start","end"),l=[];for(let d=1;d<s.length-1;d++)l.push(o.table[s[d]].node);return ut.fromArray(ma(l))};ut.rawSplit=function(e){return ut.fromArray(yo(e,pn.isKanjiModeEnabled()))}});var bo=Y(vo=>{var yn=Fe(),ir=cn(),va=Mi(),ba=Oi(),_a=Li(),Ea=Bi(),ar=$i(),cr=Kn(),xa=Vi(),mn=Ji(),Sa=eo(),Aa=ze(),or=wo();function Ia(n,e){let t=n.size,r=Ea.getPositions(e);for(let i=0;i<r.length;i++){let o=r[i][0],s=r[i][1];for(let l=-1;l<=7;l++)if(!(o+l<=-1||t<=o+l))for(let d=-1;d<=7;d++)s+d<=-1||t<=s+d||(l>=0&&l<=6&&(d===0||d===6)||d>=0&&d<=6&&(l===0||l===6)||l>=2&&l<=4&&d>=2&&d<=4?n.set(o+l,s+d,!0,!0):n.set(o+l,s+d,!1,!0))}}function Ca(n){let e=n.size;for(let t=8;t<e-8;t++){let r=t%2===0;n.set(t,6,r,!0),n.set(6,t,r,!0)}}function Ta(n,e){let t=_a.getPositions(e);for(let r=0;r<t.length;r++){let i=t[r][0],o=t[r][1];for(let s=-2;s<=2;s++)for(let l=-2;l<=2;l++)s===-2||s===2||l===-2||l===2||s===0&&l===0?n.set(i+s,o+l,!0,!0):n.set(i+s,o+l,!1,!0)}}function Ra(n,e){let t=n.size,r=mn.getEncodedBits(e),i,o,s;for(let l=0;l<18;l++)i=Math.floor(l/3),o=l%3+t-8-3,s=(r>>l&1)===1,n.set(i,o,s,!0),n.set(o,i,s,!0)}function sr(n,e,t){let r=n.size,i=Sa.getEncodedBits(e,t),o,s;for(o=0;o<15;o++)s=(i>>o&1)===1,o<6?n.set(o,8,s,!0):o<8?n.set(o+1,8,s,!0):n.set(r-15+o,8,s,!0),o<8?n.set(8,r-o-1,s,!0):o<9?n.set(8,15-o-1+1,s,!0):n.set(8,15-o-1,s,!0);n.set(r-8,8,1,!0)}function ka(n,e){let t=n.size,r=-1,i=t-1,o=7,s=0;for(let l=t-1;l>0;l-=2)for(l===6&&l--;;){for(let d=0;d<2;d++)if(!n.isReserved(i,l-d)){let g=!1;s<e.length&&(g=(e[s]>>>o&1)===1),n.set(i,l-d,g),o--,o===-1&&(s++,o=7)}if(i+=r,i<0||t<=i){i-=r,r=-r;break}}}function Ma(n,e,t){let r=new va;t.forEach(function(d){r.put(d.mode.bit,4),r.put(d.getLength(),Aa.getCharCountIndicator(d.mode,n)),d.write(r)});let i=yn.getSymbolTotalCodewords(n),o=cr.getTotalCodewordsCount(n,e),s=(i-o)*8;for(r.getLengthInBits()+4<=s&&r.put(0,4);r.getLengthInBits()%8!==0;)r.putBit(0);let l=(s-r.getLengthInBits())/8;for(let d=0;d<l;d++)r.put(d%2?17:236,8);return Pa(r,n,e)}function Pa(n,e,t){let r=yn.getSymbolTotalCodewords(e),i=cr.getTotalCodewordsCount(e,t),o=r-i,s=cr.getBlocksCount(e,t),l=r%s,d=s-l,g=Math.floor(r/s),S=Math.floor(o/s),w=S+1,m=g-S,_=new xa(m),I=0,L=new Array(s),U=new Array(s),G=0,ne=new Uint8Array(n.buffer);for(let de=0;de<s;de++){let Ee=de<d?S:w;L[de]=ne.slice(I,I+Ee),U[de]=_.encode(L[de]),I+=Ee,G=Math.max(G,Ee)}let _e=new Uint8Array(r),ve=0,pe,he;for(pe=0;pe<G;pe++)for(he=0;he<s;he++)pe<L[he].length&&(_e[ve++]=L[he][pe]);for(pe=0;pe<m;pe++)for(he=0;he<s;he++)_e[ve++]=U[he][pe];return _e}function Oa(n,e,t,r){let i;if(Array.isArray(n))i=or.fromArray(n);else if(typeof n=="string"){let g=e;if(!g){let S=or.rawSplit(n);g=mn.getBestVersionForData(S,t)}i=or.fromString(n,g||40)}else throw new Error("Invalid data");let o=mn.getBestVersionForData(i,t);if(!o)throw new Error("The amount of data is too big to be stored in a QR Code");if(!e)e=o;else if(e<o)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+o+`.
`);let s=Ma(e,t,i),l=yn.getSymbolSize(e),d=new ba(l);return Ia(d,e),Ca(d),Ta(d,e),sr(d,t,0),e>=7&&Ra(d,e),ka(d,s),isNaN(r)&&(r=ar.getBestMask(d,sr.bind(null,d,t))),ar.applyMask(r,d),sr(d,t,r),{modules:d,version:e,errorCorrectionLevel:t,maskPattern:r,segments:i}}vo.create=function(e,t){if(typeof e>"u"||e==="")throw new Error("No input text");let r=ir.M,i,o;return typeof t<"u"&&(r=ir.from(t.errorCorrectionLevel,ir.M),i=mn.from(t.version),o=ar.from(t.maskPattern),t.toSJISFunc&&yn.setToSJISFunction(t.toSJISFunc)),Oa(e,i,r,o)}});var lr=Y(et=>{function _o(n){if(typeof n=="number"&&(n=n.toString()),typeof n!="string")throw new Error("Color should be defined as hex string");let e=n.slice().replace("#","").split("");if(e.length<3||e.length===5||e.length>8)throw new Error("Invalid hex color: "+n);(e.length===3||e.length===4)&&(e=Array.prototype.concat.apply([],e.map(function(r){return[r,r]}))),e.length===6&&e.push("F","F");let t=parseInt(e.join(""),16);return{r:t>>24&255,g:t>>16&255,b:t>>8&255,a:t&255,hex:"#"+e.slice(0,6).join("")}}et.getOptions=function(e){e||(e={}),e.color||(e.color={});let t=typeof e.margin>"u"||e.margin===null||e.margin<0?4:e.margin,r=e.width&&e.width>=21?e.width:void 0,i=e.scale||4;return{width:r,scale:r?4:i,margin:t,color:{dark:_o(e.color.dark||"#000000ff"),light:_o(e.color.light||"#ffffffff")},type:e.type,rendererOpts:e.rendererOpts||{}}};et.getScale=function(e,t){return t.width&&t.width>=e+t.margin*2?t.width/(e+t.margin*2):t.scale};et.getImageWidth=function(e,t){let r=et.getScale(e,t);return Math.floor((e+t.margin*2)*r)};et.qrToImageData=function(e,t,r){let i=t.modules.size,o=t.modules.data,s=et.getScale(i,r),l=Math.floor((i+r.margin*2)*s),d=r.margin*s,g=[r.color.light,r.color.dark];for(let S=0;S<l;S++)for(let w=0;w<l;w++){let m=(S*l+w)*4,_=r.color.light;if(S>=d&&w>=d&&S<l-d&&w<l-d){let I=Math.floor((S-d)/s),L=Math.floor((w-d)/s);_=g[o[I*i+L]?1:0]}e[m++]=_.r,e[m++]=_.g,e[m++]=_.b,e[m]=_.a}}});var Eo=Y(wn=>{var dr=lr();function La(n,e,t){n.clearRect(0,0,e.width,e.height),e.style||(e.style={}),e.height=t,e.width=t,e.style.height=t+"px",e.style.width=t+"px"}function Na(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}wn.render=function(e,t,r){let i=r,o=t;typeof i>"u"&&(!t||!t.getContext)&&(i=t,t=void 0),t||(o=Na()),i=dr.getOptions(i);let s=dr.getImageWidth(e.modules.size,i),l=o.getContext("2d"),d=l.createImageData(s,s);return dr.qrToImageData(d.data,e,i),La(l,o,s),l.putImageData(d,0,0),o};wn.renderToDataURL=function(e,t,r){let i=r;typeof i>"u"&&(!t||!t.getContext)&&(i=t,t=void 0),i||(i={});let o=wn.render(e,t,i),s=i.type||"image/png",l=i.rendererOpts||{};return o.toDataURL(s,l.quality)}});var Ao=Y(So=>{var Da=lr();function xo(n,e){let t=n.a/255,r=e+'="'+n.hex+'"';return t<1?r+" "+e+'-opacity="'+t.toFixed(2).slice(1)+'"':r}function ur(n,e,t){let r=n+e;return typeof t<"u"&&(r+=" "+t),r}function Ba(n,e,t){let r="",i=0,o=!1,s=0;for(let l=0;l<n.length;l++){let d=Math.floor(l%e),g=Math.floor(l/e);!d&&!o&&(o=!0),n[l]?(s++,l>0&&d>0&&n[l-1]||(r+=o?ur("M",d+t,.5+g+t):ur("m",i,0),i=0,o=!1),d+1<e&&n[l+1]||(r+=ur("h",s),s=0)):i++}return r}So.render=function(e,t,r){let i=Da.getOptions(t),o=e.modules.size,s=e.modules.data,l=o+i.margin*2,d=i.color.light.a?"<path "+xo(i.color.light,"fill")+' d="M0 0h'+l+"v"+l+'H0z"/>':"",g="<path "+xo(i.color.dark,"stroke")+' d="'+Ba(s,o,i.margin)+'"/>',S='viewBox="0 0 '+l+" "+l+'"',m='<svg xmlns="http://www.w3.org/2000/svg" '+(i.width?'width="'+i.width+'" height="'+i.width+'" ':"")+S+' shape-rendering="crispEdges">'+d+g+`</svg>
`;return typeof r=="function"&&r(null,m),m}});var Co=Y(Ut=>{var $a=Ti(),hr=bo(),Io=Eo(),Ua=Ao();function fr(n,e,t,r,i){let o=[].slice.call(arguments,1),s=o.length,l=typeof o[s-1]=="function";if(!l&&!$a())throw new Error("Callback required as last argument");if(l){if(s<2)throw new Error("Too few arguments provided");s===2?(i=t,t=e,e=r=void 0):s===3&&(e.getContext&&typeof i>"u"?(i=r,r=void 0):(i=r,r=t,t=e,e=void 0))}else{if(s<1)throw new Error("Too few arguments provided");return s===1?(t=e,e=r=void 0):s===2&&!e.getContext&&(r=t,t=e,e=void 0),new Promise(function(d,g){try{let S=hr.create(t,r);d(n(S,e,r))}catch(S){g(S)}})}try{let d=hr.create(t,r);i(null,n(d,e,r))}catch(d){i(d)}}Ut.create=hr.create;Ut.toCanvas=fr.bind(null,Io.render);Ut.toDataURL=fr.bind(null,Io.renderToDataURL);Ut.toString=fr.bind(null,function(n,e,t){return Ua.render(n,t)})});var ko=Y((Vt,br)=>{(function(n,e){typeof Vt=="object"&&typeof br=="object"?br.exports=e():typeof define=="function"&&define.amd?define([],e):typeof Vt=="object"?Vt.QRCodeStyling=e():n.QRCodeStyling=e()})(Vt,(()=>(()=>{var n={873:(i,o)=>{var s,l,d=(function(){var g=function(C,A){var b=C,c=L[A],a=null,h=0,f=null,u=[],v={},k=function(p,E){a=(function(y){for(var x=new Array(y),T=0;T<y;T+=1){x[T]=new Array(y);for(var B=0;B<y;B+=1)x[T][B]=null}return x})(h=4*b+17),R(0,0),R(h-7,0),R(0,h-7),M(),N(),P(p,E),b>=7&&D(p),f==null&&(f=j(b,c,u)),$(f,E)},R=function(p,E){for(var y=-1;y<=7;y+=1)if(!(p+y<=-1||h<=p+y))for(var x=-1;x<=7;x+=1)E+x<=-1||h<=E+x||(a[p+y][E+x]=0<=y&&y<=6&&(x==0||x==6)||0<=x&&x<=6&&(y==0||y==6)||2<=y&&y<=4&&2<=x&&x<=4)},N=function(){for(var p=8;p<h-8;p+=1)a[p][6]==null&&(a[p][6]=p%2==0);for(var E=8;E<h-8;E+=1)a[6][E]==null&&(a[6][E]=E%2==0)},M=function(){for(var p=U.getPatternPosition(b),E=0;E<p.length;E+=1)for(var y=0;y<p.length;y+=1){var x=p[E],T=p[y];if(a[x][T]==null)for(var B=-2;B<=2;B+=1)for(var z=-2;z<=2;z+=1)a[x+B][T+z]=B==-2||B==2||z==-2||z==2||B==0&&z==0}},D=function(p){for(var E=U.getBCHTypeNumber(b),y=0;y<18;y+=1){var x=!p&&(E>>y&1)==1;a[Math.floor(y/3)][y%3+h-8-3]=x}for(y=0;y<18;y+=1)x=!p&&(E>>y&1)==1,a[y%3+h-8-3][Math.floor(y/3)]=x},P=function(p,E){for(var y=c<<3|E,x=U.getBCHTypeInfo(y),T=0;T<15;T+=1){var B=!p&&(x>>T&1)==1;T<6?a[T][8]=B:T<8?a[T+1][8]=B:a[h-15+T][8]=B}for(T=0;T<15;T+=1)B=!p&&(x>>T&1)==1,T<8?a[8][h-T-1]=B:T<9?a[8][15-T-1+1]=B:a[8][15-T-1]=B;a[h-8][8]=!p},$=function(p,E){for(var y=-1,x=h-1,T=7,B=0,z=U.getMaskFunction(E),H=h-1;H>0;H-=2)for(H==6&&(H-=1);;){for(var K=0;K<2;K+=1)if(a[x][H-K]==null){var W=!1;B<p.length&&(W=(p[B]>>>T&1)==1),z(x,H-K)&&(W=!W),a[x][H-K]=W,(T-=1)==-1&&(B+=1,T=7)}if((x+=y)<0||h<=x){x-=y,y=-y;break}}},j=function(p,E,y){for(var x=_e.getRSBlocks(p,E),T=ve(),B=0;B<y.length;B+=1){var z=y[B];T.put(z.getMode(),4),T.put(z.getLength(),U.getLengthInBits(z.getMode(),p)),z.write(T)}var H=0;for(B=0;B<x.length;B+=1)H+=x[B].dataCount;if(T.getLengthInBits()>8*H)throw"code length overflow. ("+T.getLengthInBits()+">"+8*H+")";for(T.getLengthInBits()+4<=8*H&&T.put(0,4);T.getLengthInBits()%8!=0;)T.putBit(!1);for(;!(T.getLengthInBits()>=8*H||(T.put(236,8),T.getLengthInBits()>=8*H));)T.put(17,8);return(function(K,W){for(var Z=0,ue=0,ie=0,ee=new Array(W.length),Q=new Array(W.length),F=0;F<W.length;F+=1){var re=W[F].dataCount,le=W[F].totalCount-re;ue=Math.max(ue,re),ie=Math.max(ie,le),ee[F]=new Array(re);for(var V=0;V<ee[F].length;V+=1)ee[F][V]=255&K.getBuffer()[V+Z];Z+=re;var be=U.getErrorCorrectPolynomial(le),me=ne(ee[F],be.getLength()-1).mod(be);for(Q[F]=new Array(be.getLength()-1),V=0;V<Q[F].length;V+=1){var fe=V+me.getLength()-Q[F].length;Q[F][V]=fe>=0?me.getAt(fe):0}}var Kt=0;for(V=0;V<W.length;V+=1)Kt+=W[V].totalCount;var vt=new Array(Kt),Te=0;for(V=0;V<ue;V+=1)for(F=0;F<W.length;F+=1)V<ee[F].length&&(vt[Te]=ee[F][V],Te+=1);for(V=0;V<ie;V+=1)for(F=0;F<W.length;F+=1)V<Q[F].length&&(vt[Te]=Q[F][V],Te+=1);return vt})(T,x)};v.addData=function(p,E){var y=null;switch(E=E||"Byte"){case"Numeric":y=pe(p);break;case"Alphanumeric":y=he(p);break;case"Byte":y=de(p);break;case"Kanji":y=Ee(p);break;default:throw"mode:"+E}u.push(y),f=null},v.isDark=function(p,E){if(p<0||h<=p||E<0||h<=E)throw p+","+E;return a[p][E]},v.getModuleCount=function(){return h},v.make=function(){if(b<1){for(var p=1;p<40;p++){for(var E=_e.getRSBlocks(p,c),y=ve(),x=0;x<u.length;x++){var T=u[x];y.put(T.getMode(),4),y.put(T.getLength(),U.getLengthInBits(T.getMode(),p)),T.write(y)}var B=0;for(x=0;x<E.length;x++)B+=E[x].dataCount;if(y.getLengthInBits()<=8*B)break}b=p}k(!1,(function(){for(var z=0,H=0,K=0;K<8;K+=1){k(!0,K);var W=U.getLostPoint(v);(K==0||z>W)&&(z=W,H=K)}return H})())},v.createTableTag=function(p,E){p=p||2;var y="";y+='<table style="',y+=" border-width: 0px; border-style: none;",y+=" border-collapse: collapse;",y+=" padding: 0px; margin: "+(E=E===void 0?4*p:E)+"px;",y+='">',y+="<tbody>";for(var x=0;x<v.getModuleCount();x+=1){y+="<tr>";for(var T=0;T<v.getModuleCount();T+=1)y+='<td style="',y+=" border-width: 0px; border-style: none;",y+=" border-collapse: collapse;",y+=" padding: 0px; margin: 0px;",y+=" width: "+p+"px;",y+=" height: "+p+"px;",y+=" background-color: ",y+=v.isDark(x,T)?"#000000":"#ffffff",y+=";",y+='"/>';y+="</tr>"}return(y+="</tbody>")+"</table>"},v.createSvgTag=function(p,E,y,x){var T={};typeof arguments[0]=="object"&&(p=(T=arguments[0]).cellSize,E=T.margin,y=T.alt,x=T.title),p=p||2,E=E===void 0?4*p:E,(y=typeof y=="string"?{text:y}:y||{}).text=y.text||null,y.id=y.text?y.id||"qrcode-description":null,(x=typeof x=="string"?{text:x}:x||{}).text=x.text||null,x.id=x.text?x.id||"qrcode-title":null;var B,z,H,K,W=v.getModuleCount()*p+2*E,Z="";for(K="l"+p+",0 0,"+p+" -"+p+",0 0,-"+p+"z ",Z+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',Z+=T.scalable?"":' width="'+W+'px" height="'+W+'px"',Z+=' viewBox="0 0 '+W+" "+W+'" ',Z+=' preserveAspectRatio="xMinYMin meet"',Z+=x.text||y.text?' role="img" aria-labelledby="'+q([x.id,y.id].join(" ").trim())+'"':"",Z+=">",Z+=x.text?'<title id="'+q(x.id)+'">'+q(x.text)+"</title>":"",Z+=y.text?'<description id="'+q(y.id)+'">'+q(y.text)+"</description>":"",Z+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',Z+='<path d="',z=0;z<v.getModuleCount();z+=1)for(H=z*p+E,B=0;B<v.getModuleCount();B+=1)v.isDark(z,B)&&(Z+="M"+(B*p+E)+","+H+K);return(Z+='" stroke="transparent" fill="black"/>')+"</svg>"},v.createDataURL=function(p,E){p=p||2,E=E===void 0?4*p:E;var y=v.getModuleCount()*p+2*E,x=E,T=y-E;return Le(y,y,(function(B,z){if(x<=B&&B<T&&x<=z&&z<T){var H=Math.floor((B-x)/p),K=Math.floor((z-x)/p);return v.isDark(K,H)?0:1}return 1}))},v.createImgTag=function(p,E,y){p=p||2,E=E===void 0?4*p:E;var x=v.getModuleCount()*p+2*E,T="";return T+="<img",T+=' src="',T+=v.createDataURL(p,E),T+='"',T+=' width="',T+=x,T+='"',T+=' height="',T+=x,T+='"',y&&(T+=' alt="',T+=q(y),T+='"'),T+"/>"};var q=function(p){for(var E="",y=0;y<p.length;y+=1){var x=p.charAt(y);switch(x){case"<":E+="&lt;";break;case">":E+="&gt;";break;case"&":E+="&amp;";break;case'"':E+="&quot;";break;default:E+=x}}return E};return v.createASCII=function(p,E){if((p=p||1)<2)return(function(ee){ee=ee===void 0?2:ee;var Q,F,re,le,V,be=1*v.getModuleCount()+2*ee,me=ee,fe=be-ee,Kt={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},vt={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},Te="";for(Q=0;Q<be;Q+=2){for(re=Math.floor((Q-me)/1),le=Math.floor((Q+1-me)/1),F=0;F<be;F+=1)V="\u2588",me<=F&&F<fe&&me<=Q&&Q<fe&&v.isDark(re,Math.floor((F-me)/1))&&(V=" "),me<=F&&F<fe&&me<=Q+1&&Q+1<fe&&v.isDark(le,Math.floor((F-me)/1))?V+=" ":V+="\u2588",Te+=ee<1&&Q+1>=fe?vt[V]:Kt[V];Te+=`
`}return be%2&&ee>0?Te.substring(0,Te.length-be-1)+Array(be+1).join("\u2580"):Te.substring(0,Te.length-1)})(E);p-=1,E=E===void 0?2*p:E;var y,x,T,B,z=v.getModuleCount()*p+2*E,H=E,K=z-E,W=Array(p+1).join("\u2588\u2588"),Z=Array(p+1).join("  "),ue="",ie="";for(y=0;y<z;y+=1){for(T=Math.floor((y-H)/p),ie="",x=0;x<z;x+=1)B=1,H<=x&&x<K&&H<=y&&y<K&&v.isDark(T,Math.floor((x-H)/p))&&(B=0),ie+=B?W:Z;for(T=0;T<p;T+=1)ue+=ie+`
`}return ue.substring(0,ue.length-1)},v.renderTo2dContext=function(p,E){E=E||2;for(var y=v.getModuleCount(),x=0;x<y;x++)for(var T=0;T<y;T++)p.fillStyle=v.isDark(x,T)?"black":"white",p.fillRect(x*E,T*E,E,E)},v};g.stringToBytes=(g.stringToBytesFuncs={default:function(C){for(var A=[],b=0;b<C.length;b+=1){var c=C.charCodeAt(b);A.push(255&c)}return A}}).default,g.createStringToBytes=function(C,A){var b=(function(){for(var a=Ae(C),h=function(){var N=a.read();if(N==-1)throw"eof";return N},f=0,u={};;){var v=a.read();if(v==-1)break;var k=h(),R=h()<<8|h();u[String.fromCharCode(v<<8|k)]=R,f+=1}if(f!=A)throw f+" != "+A;return u})(),c=63;return function(a){for(var h=[],f=0;f<a.length;f+=1){var u=a.charCodeAt(f);if(u<128)h.push(u);else{var v=b[a.charAt(f)];typeof v=="number"?(255&v)==v?h.push(v):(h.push(v>>>8),h.push(255&v)):h.push(c)}}return h}};var S,w,m,_,I,L={L:1,M:0,Q:3,H:2},U=(S=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],w=1335,m=7973,I=function(C){for(var A=0;C!=0;)A+=1,C>>>=1;return A},(_={}).getBCHTypeInfo=function(C){for(var A=C<<10;I(A)-I(w)>=0;)A^=w<<I(A)-I(w);return 21522^(C<<10|A)},_.getBCHTypeNumber=function(C){for(var A=C<<12;I(A)-I(m)>=0;)A^=m<<I(A)-I(m);return C<<12|A},_.getPatternPosition=function(C){return S[C-1]},_.getMaskFunction=function(C){switch(C){case 0:return function(A,b){return(A+b)%2==0};case 1:return function(A,b){return A%2==0};case 2:return function(A,b){return b%3==0};case 3:return function(A,b){return(A+b)%3==0};case 4:return function(A,b){return(Math.floor(A/2)+Math.floor(b/3))%2==0};case 5:return function(A,b){return A*b%2+A*b%3==0};case 6:return function(A,b){return(A*b%2+A*b%3)%2==0};case 7:return function(A,b){return(A*b%3+(A+b)%2)%2==0};default:throw"bad maskPattern:"+C}},_.getErrorCorrectPolynomial=function(C){for(var A=ne([1],0),b=0;b<C;b+=1)A=A.multiply(ne([1,G.gexp(b)],0));return A},_.getLengthInBits=function(C,A){if(1<=A&&A<10)switch(C){case 1:return 10;case 2:return 9;case 4:case 8:return 8;default:throw"mode:"+C}else if(A<27)switch(C){case 1:return 12;case 2:return 11;case 4:return 16;case 8:return 10;default:throw"mode:"+C}else{if(!(A<41))throw"type:"+A;switch(C){case 1:return 14;case 2:return 13;case 4:return 16;case 8:return 12;default:throw"mode:"+C}}},_.getLostPoint=function(C){for(var A=C.getModuleCount(),b=0,c=0;c<A;c+=1)for(var a=0;a<A;a+=1){for(var h=0,f=C.isDark(c,a),u=-1;u<=1;u+=1)if(!(c+u<0||A<=c+u))for(var v=-1;v<=1;v+=1)a+v<0||A<=a+v||u==0&&v==0||f==C.isDark(c+u,a+v)&&(h+=1);h>5&&(b+=3+h-5)}for(c=0;c<A-1;c+=1)for(a=0;a<A-1;a+=1){var k=0;C.isDark(c,a)&&(k+=1),C.isDark(c+1,a)&&(k+=1),C.isDark(c,a+1)&&(k+=1),C.isDark(c+1,a+1)&&(k+=1),k!=0&&k!=4||(b+=3)}for(c=0;c<A;c+=1)for(a=0;a<A-6;a+=1)C.isDark(c,a)&&!C.isDark(c,a+1)&&C.isDark(c,a+2)&&C.isDark(c,a+3)&&C.isDark(c,a+4)&&!C.isDark(c,a+5)&&C.isDark(c,a+6)&&(b+=40);for(a=0;a<A;a+=1)for(c=0;c<A-6;c+=1)C.isDark(c,a)&&!C.isDark(c+1,a)&&C.isDark(c+2,a)&&C.isDark(c+3,a)&&C.isDark(c+4,a)&&!C.isDark(c+5,a)&&C.isDark(c+6,a)&&(b+=40);var R=0;for(a=0;a<A;a+=1)for(c=0;c<A;c+=1)C.isDark(c,a)&&(R+=1);return b+Math.abs(100*R/A/A-50)/5*10},_),G=(function(){for(var C=new Array(256),A=new Array(256),b=0;b<8;b+=1)C[b]=1<<b;for(b=8;b<256;b+=1)C[b]=C[b-4]^C[b-5]^C[b-6]^C[b-8];for(b=0;b<255;b+=1)A[C[b]]=b;return{glog:function(c){if(c<1)throw"glog("+c+")";return A[c]},gexp:function(c){for(;c<0;)c+=255;for(;c>=256;)c-=255;return C[c]}}})();function ne(C,A){if(C.length===void 0)throw C.length+"/"+A;var b=(function(){for(var a=0;a<C.length&&C[a]==0;)a+=1;for(var h=new Array(C.length-a+A),f=0;f<C.length-a;f+=1)h[f]=C[f+a];return h})(),c={getAt:function(a){return b[a]},getLength:function(){return b.length},multiply:function(a){for(var h=new Array(c.getLength()+a.getLength()-1),f=0;f<c.getLength();f+=1)for(var u=0;u<a.getLength();u+=1)h[f+u]^=G.gexp(G.glog(c.getAt(f))+G.glog(a.getAt(u)));return ne(h,0)},mod:function(a){if(c.getLength()-a.getLength()<0)return c;for(var h=G.glog(c.getAt(0))-G.glog(a.getAt(0)),f=new Array(c.getLength()),u=0;u<c.getLength();u+=1)f[u]=c.getAt(u);for(u=0;u<a.getLength();u+=1)f[u]^=G.gexp(G.glog(a.getAt(u))+h);return ne(f,0).mod(a)}};return c}var _e=(function(){var C=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],A=function(c,a){var h={};return h.totalCount=c,h.dataCount=a,h},b={getRSBlocks:function(c,a){var h=(function(D,P){switch(P){case L.L:return C[4*(D-1)+0];case L.M:return C[4*(D-1)+1];case L.Q:return C[4*(D-1)+2];case L.H:return C[4*(D-1)+3];default:return}})(c,a);if(h===void 0)throw"bad rs block @ typeNumber:"+c+"/errorCorrectionLevel:"+a;for(var f=h.length/3,u=[],v=0;v<f;v+=1)for(var k=h[3*v+0],R=h[3*v+1],N=h[3*v+2],M=0;M<k;M+=1)u.push(A(R,N));return u}};return b})(),ve=function(){var C=[],A=0,b={getBuffer:function(){return C},getAt:function(c){var a=Math.floor(c/8);return(C[a]>>>7-c%8&1)==1},put:function(c,a){for(var h=0;h<a;h+=1)b.putBit((c>>>a-h-1&1)==1)},getLengthInBits:function(){return A},putBit:function(c){var a=Math.floor(A/8);C.length<=a&&C.push(0),c&&(C[a]|=128>>>A%8),A+=1}};return b},pe=function(C){var A=C,b={getMode:function(){return 1},getLength:function(h){return A.length},write:function(h){for(var f=A,u=0;u+2<f.length;)h.put(c(f.substring(u,u+3)),10),u+=3;u<f.length&&(f.length-u==1?h.put(c(f.substring(u,u+1)),4):f.length-u==2&&h.put(c(f.substring(u,u+2)),7))}},c=function(h){for(var f=0,u=0;u<h.length;u+=1)f=10*f+a(h.charAt(u));return f},a=function(h){if("0"<=h&&h<="9")return h.charCodeAt(0)-48;throw"illegal char :"+h};return b},he=function(C){var A=C,b={getMode:function(){return 2},getLength:function(a){return A.length},write:function(a){for(var h=A,f=0;f+1<h.length;)a.put(45*c(h.charAt(f))+c(h.charAt(f+1)),11),f+=2;f<h.length&&a.put(c(h.charAt(f)),6)}},c=function(a){if("0"<=a&&a<="9")return a.charCodeAt(0)-48;if("A"<=a&&a<="Z")return a.charCodeAt(0)-65+10;switch(a){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+a}};return b},de=function(C){var A=g.stringToBytes(C);return{getMode:function(){return 4},getLength:function(b){return A.length},write:function(b){for(var c=0;c<A.length;c+=1)b.put(A[c],8)}}},Ee=function(C){var A=g.stringToBytesFuncs.SJIS;if(!A)throw"sjis not supported.";(function(){var a=A("\u53CB");if(a.length!=2||(a[0]<<8|a[1])!=38726)throw"sjis not supported."})();var b=A(C),c={getMode:function(){return 8},getLength:function(a){return~~(b.length/2)},write:function(a){for(var h=b,f=0;f+1<h.length;){var u=(255&h[f])<<8|255&h[f+1];if(33088<=u&&u<=40956)u-=33088;else{if(!(57408<=u&&u<=60351))throw"illegal char at "+(f+1)+"/"+u;u-=49472}u=192*(u>>>8&255)+(255&u),a.put(u,13),f+=2}if(f<h.length)throw"illegal char at "+(f+1)}};return c},xe=function(){var C=[],A={writeByte:function(b){C.push(255&b)},writeShort:function(b){A.writeByte(b),A.writeByte(b>>>8)},writeBytes:function(b,c,a){c=c||0,a=a||b.length;for(var h=0;h<a;h+=1)A.writeByte(b[h+c])},writeString:function(b){for(var c=0;c<b.length;c+=1)A.writeByte(b.charCodeAt(c))},toByteArray:function(){return C},toString:function(){var b="";b+="[";for(var c=0;c<C.length;c+=1)c>0&&(b+=","),b+=C[c];return b+"]"}};return A},Ae=function(C){var A=C,b=0,c=0,a=0,h={read:function(){for(;a<8;){if(b>=A.length){if(a==0)return-1;throw"unexpected end of file./"+a}var u=A.charAt(b);if(b+=1,u=="=")return a=0,-1;u.match(/^\s$/)||(c=c<<6|f(u.charCodeAt(0)),a+=6)}var v=c>>>a-8&255;return a-=8,v}},f=function(u){if(65<=u&&u<=90)return u-65;if(97<=u&&u<=122)return u-97+26;if(48<=u&&u<=57)return u-48+52;if(u==43)return 62;if(u==47)return 63;throw"c:"+u};return h},Le=function(C,A,b){for(var c=(function(R,N){var M=R,D=N,P=new Array(R*N),$={setPixel:function(p,E,y){P[E*M+p]=y},write:function(p){p.writeString("GIF87a"),p.writeShort(M),p.writeShort(D),p.writeByte(128),p.writeByte(0),p.writeByte(0),p.writeByte(0),p.writeByte(0),p.writeByte(0),p.writeByte(255),p.writeByte(255),p.writeByte(255),p.writeString(","),p.writeShort(0),p.writeShort(0),p.writeShort(M),p.writeShort(D),p.writeByte(0);var E=j(2);p.writeByte(2);for(var y=0;E.length-y>255;)p.writeByte(255),p.writeBytes(E,y,255),y+=255;p.writeByte(E.length-y),p.writeBytes(E,y,E.length-y),p.writeByte(0),p.writeString(";")}},j=function(p){for(var E=1<<p,y=1+(1<<p),x=p+1,T=q(),B=0;B<E;B+=1)T.add(String.fromCharCode(B));T.add(String.fromCharCode(E)),T.add(String.fromCharCode(y));var z,H,K,W=xe(),Z=(z=W,H=0,K=0,{write:function(Q,F){if(Q>>>F)throw"length over";for(;H+F>=8;)z.writeByte(255&(Q<<H|K)),F-=8-H,Q>>>=8-H,K=0,H=0;K|=Q<<H,H+=F},flush:function(){H>0&&z.writeByte(K)}});Z.write(E,x);var ue=0,ie=String.fromCharCode(P[ue]);for(ue+=1;ue<P.length;){var ee=String.fromCharCode(P[ue]);ue+=1,T.contains(ie+ee)?ie+=ee:(Z.write(T.indexOf(ie),x),T.size()<4095&&(T.size()==1<<x&&(x+=1),T.add(ie+ee)),ie=ee)}return Z.write(T.indexOf(ie),x),Z.write(y,x),Z.flush(),W.toByteArray()},q=function(){var p={},E=0,y={add:function(x){if(y.contains(x))throw"dup key:"+x;p[x]=E,E+=1},size:function(){return E},indexOf:function(x){return p[x]},contains:function(x){return p[x]!==void 0}};return y};return $})(C,A),a=0;a<A;a+=1)for(var h=0;h<C;h+=1)c.setPixel(h,a,b(h,a));var f=xe();c.write(f);for(var u=(function(){var R=0,N=0,M=0,D="",P={},$=function(q){D+=String.fromCharCode(j(63&q))},j=function(q){if(!(q<0)){if(q<26)return 65+q;if(q<52)return q-26+97;if(q<62)return q-52+48;if(q==62)return 43;if(q==63)return 47}throw"n:"+q};return P.writeByte=function(q){for(R=R<<8|255&q,N+=8,M+=1;N>=6;)$(R>>>N-6),N-=6},P.flush=function(){if(N>0&&($(R<<6-N),R=0,N=0),M%3!=0)for(var q=3-M%3,p=0;p<q;p+=1)D+="="},P.toString=function(){return D},P})(),v=f.toByteArray(),k=0;k<v.length;k+=1)u.writeByte(v[k]);return u.flush(),"data:image/gif;base64,"+u};return g})();d.stringToBytesFuncs["UTF-8"]=function(g){return(function(S){for(var w=[],m=0;m<S.length;m++){var _=S.charCodeAt(m);_<128?w.push(_):_<2048?w.push(192|_>>6,128|63&_):_<55296||_>=57344?w.push(224|_>>12,128|_>>6&63,128|63&_):(m++,_=65536+((1023&_)<<10|1023&S.charCodeAt(m)),w.push(240|_>>18,128|_>>12&63,128|_>>6&63,128|63&_))}return w})(g)},(l=typeof(s=function(){return d})=="function"?s.apply(o,[]):s)===void 0||(i.exports=l)}},e={};function t(i){var o=e[i];if(o!==void 0)return o.exports;var s=e[i]={exports:{}};return n[i](s,s.exports,t),s.exports}t.n=i=>{var o=i&&i.__esModule?()=>i.default:()=>i;return t.d(o,{a:o}),o},t.d=(i,o)=>{for(var s in o)t.o(o,s)&&!t.o(i,s)&&Object.defineProperty(i,s,{enumerable:!0,get:o[s]})},t.o=(i,o)=>Object.prototype.hasOwnProperty.call(i,o);var r={};return(()=>{"use strict";t.d(r,{default:()=>A});let i=b=>!!b&&typeof b=="object"&&!Array.isArray(b);function o(b,...c){if(!c.length)return b;let a=c.shift();return a!==void 0&&i(b)&&i(a)?(b=Object.assign({},b),Object.keys(a).forEach((h=>{let f=b[h],u=a[h];Array.isArray(f)&&Array.isArray(u)?b[h]=u:i(f)&&i(u)?b[h]=o(Object.assign({},f),u):b[h]=u})),o(b,...c)):b}function s(b,c){let a=document.createElement("a");a.download=c,a.href=b,document.body.appendChild(a),a.click(),document.body.removeChild(a)}let l={L:.07,M:.15,Q:.25,H:.3};class d{constructor({svg:c,type:a,window:h}){this._svg=c,this._type=a,this._window=h}draw(c,a,h,f){let u;switch(this._type){case"dots":u=this._drawDot;break;case"classy":u=this._drawClassy;break;case"classy-rounded":u=this._drawClassyRounded;break;case"rounded":u=this._drawRounded;break;case"extra-rounded":u=this._drawExtraRounded;break;default:u=this._drawSquare}u.call(this,{x:c,y:a,size:h,getNeighbor:f})}_rotateFigure({x:c,y:a,size:h,rotation:f=0,draw:u}){var v;let k=c+h/2,R=a+h/2;u(),(v=this._element)===null||v===void 0||v.setAttribute("transform",`rotate(${180*f/Math.PI},${k},${R})`)}_basicDot(c){let{size:a,x:h,y:f}=c;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","circle"),this._element.setAttribute("cx",String(h+a/2)),this._element.setAttribute("cy",String(f+a/2)),this._element.setAttribute("r",String(a/2))}}))}_basicSquare(c){let{size:a,x:h,y:f}=c;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","rect"),this._element.setAttribute("x",String(h)),this._element.setAttribute("y",String(f)),this._element.setAttribute("width",String(a)),this._element.setAttribute("height",String(a))}}))}_basicSideRounded(c){let{size:a,x:h,y:f}=c;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","path"),this._element.setAttribute("d",`M ${h} ${f}v ${a}h `+a/2+`a ${a/2} ${a/2}, 0, 0, 0, 0 ${-a}`)}}))}_basicCornerRounded(c){let{size:a,x:h,y:f}=c;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","path"),this._element.setAttribute("d",`M ${h} ${f}v ${a}h ${a}v `+-a/2+`a ${a/2} ${a/2}, 0, 0, 0, ${-a/2} ${-a/2}`)}}))}_basicCornerExtraRounded(c){let{size:a,x:h,y:f}=c;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","path"),this._element.setAttribute("d",`M ${h} ${f}v ${a}h ${a}a ${a} ${a}, 0, 0, 0, ${-a} ${-a}`)}}))}_basicCornersRounded(c){let{size:a,x:h,y:f}=c;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","path"),this._element.setAttribute("d",`M ${h} ${f}v `+a/2+`a ${a/2} ${a/2}, 0, 0, 0, ${a/2} ${a/2}h `+a/2+"v "+-a/2+`a ${a/2} ${a/2}, 0, 0, 0, ${-a/2} ${-a/2}`)}}))}_drawDot({x:c,y:a,size:h}){this._basicDot({x:c,y:a,size:h,rotation:0})}_drawSquare({x:c,y:a,size:h}){this._basicSquare({x:c,y:a,size:h,rotation:0})}_drawRounded({x:c,y:a,size:h,getNeighbor:f}){let u=f?+f(-1,0):0,v=f?+f(1,0):0,k=f?+f(0,-1):0,R=f?+f(0,1):0,N=u+v+k+R;if(N!==0)if(N>2||u&&v||k&&R)this._basicSquare({x:c,y:a,size:h,rotation:0});else{if(N===2){let M=0;return u&&k?M=Math.PI/2:k&&v?M=Math.PI:v&&R&&(M=-Math.PI/2),void this._basicCornerRounded({x:c,y:a,size:h,rotation:M})}if(N===1){let M=0;return k?M=Math.PI/2:v?M=Math.PI:R&&(M=-Math.PI/2),void this._basicSideRounded({x:c,y:a,size:h,rotation:M})}}else this._basicDot({x:c,y:a,size:h,rotation:0})}_drawExtraRounded({x:c,y:a,size:h,getNeighbor:f}){let u=f?+f(-1,0):0,v=f?+f(1,0):0,k=f?+f(0,-1):0,R=f?+f(0,1):0,N=u+v+k+R;if(N!==0)if(N>2||u&&v||k&&R)this._basicSquare({x:c,y:a,size:h,rotation:0});else{if(N===2){let M=0;return u&&k?M=Math.PI/2:k&&v?M=Math.PI:v&&R&&(M=-Math.PI/2),void this._basicCornerExtraRounded({x:c,y:a,size:h,rotation:M})}if(N===1){let M=0;return k?M=Math.PI/2:v?M=Math.PI:R&&(M=-Math.PI/2),void this._basicSideRounded({x:c,y:a,size:h,rotation:M})}}else this._basicDot({x:c,y:a,size:h,rotation:0})}_drawClassy({x:c,y:a,size:h,getNeighbor:f}){let u=f?+f(-1,0):0,v=f?+f(1,0):0,k=f?+f(0,-1):0,R=f?+f(0,1):0;u+v+k+R!==0?u||k?v||R?this._basicSquare({x:c,y:a,size:h,rotation:0}):this._basicCornerRounded({x:c,y:a,size:h,rotation:Math.PI/2}):this._basicCornerRounded({x:c,y:a,size:h,rotation:-Math.PI/2}):this._basicCornersRounded({x:c,y:a,size:h,rotation:Math.PI/2})}_drawClassyRounded({x:c,y:a,size:h,getNeighbor:f}){let u=f?+f(-1,0):0,v=f?+f(1,0):0,k=f?+f(0,-1):0,R=f?+f(0,1):0;u+v+k+R!==0?u||k?v||R?this._basicSquare({x:c,y:a,size:h,rotation:0}):this._basicCornerExtraRounded({x:c,y:a,size:h,rotation:Math.PI/2}):this._basicCornerExtraRounded({x:c,y:a,size:h,rotation:-Math.PI/2}):this._basicCornersRounded({x:c,y:a,size:h,rotation:Math.PI/2})}}let g={dot:"dot",square:"square",extraRounded:"extra-rounded"},S=Object.values(g);class w{constructor({svg:c,type:a,window:h}){this._svg=c,this._type=a,this._window=h}draw(c,a,h,f){let u;switch(this._type){case g.square:u=this._drawSquare;break;case g.extraRounded:u=this._drawExtraRounded;break;default:u=this._drawDot}u.call(this,{x:c,y:a,size:h,rotation:f})}_rotateFigure({x:c,y:a,size:h,rotation:f=0,draw:u}){var v;let k=c+h/2,R=a+h/2;u(),(v=this._element)===null||v===void 0||v.setAttribute("transform",`rotate(${180*f/Math.PI},${k},${R})`)}_basicDot(c){let{size:a,x:h,y:f}=c,u=a/7;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","path"),this._element.setAttribute("clip-rule","evenodd"),this._element.setAttribute("d",`M ${h+a/2} ${f}a ${a/2} ${a/2} 0 1 0 0.1 0zm 0 ${u}a ${a/2-u} ${a/2-u} 0 1 1 -0.1 0Z`)}}))}_basicSquare(c){let{size:a,x:h,y:f}=c,u=a/7;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","path"),this._element.setAttribute("clip-rule","evenodd"),this._element.setAttribute("d",`M ${h} ${f}v ${a}h ${a}v `+-a+`zM ${h+u} ${f+u}h `+(a-2*u)+"v "+(a-2*u)+"h "+(2*u-a)+"z")}}))}_basicExtraRounded(c){let{size:a,x:h,y:f}=c,u=a/7;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","path"),this._element.setAttribute("clip-rule","evenodd"),this._element.setAttribute("d",`M ${h} ${f+2.5*u}v `+2*u+`a ${2.5*u} ${2.5*u}, 0, 0, 0, ${2.5*u} ${2.5*u}h `+2*u+`a ${2.5*u} ${2.5*u}, 0, 0, 0, ${2.5*u} ${2.5*-u}v `+-2*u+`a ${2.5*u} ${2.5*u}, 0, 0, 0, ${2.5*-u} ${2.5*-u}h `+-2*u+`a ${2.5*u} ${2.5*u}, 0, 0, 0, ${2.5*-u} ${2.5*u}M ${h+2.5*u} ${f+u}h `+2*u+`a ${1.5*u} ${1.5*u}, 0, 0, 1, ${1.5*u} ${1.5*u}v `+2*u+`a ${1.5*u} ${1.5*u}, 0, 0, 1, ${1.5*-u} ${1.5*u}h `+-2*u+`a ${1.5*u} ${1.5*u}, 0, 0, 1, ${1.5*-u} ${1.5*-u}v `+-2*u+`a ${1.5*u} ${1.5*u}, 0, 0, 1, ${1.5*u} ${1.5*-u}`)}}))}_drawDot({x:c,y:a,size:h,rotation:f}){this._basicDot({x:c,y:a,size:h,rotation:f})}_drawSquare({x:c,y:a,size:h,rotation:f}){this._basicSquare({x:c,y:a,size:h,rotation:f})}_drawExtraRounded({x:c,y:a,size:h,rotation:f}){this._basicExtraRounded({x:c,y:a,size:h,rotation:f})}}let m={dot:"dot",square:"square"},_=Object.values(m);class I{constructor({svg:c,type:a,window:h}){this._svg=c,this._type=a,this._window=h}draw(c,a,h,f){let u;u=this._type===m.square?this._drawSquare:this._drawDot,u.call(this,{x:c,y:a,size:h,rotation:f})}_rotateFigure({x:c,y:a,size:h,rotation:f=0,draw:u}){var v;let k=c+h/2,R=a+h/2;u(),(v=this._element)===null||v===void 0||v.setAttribute("transform",`rotate(${180*f/Math.PI},${k},${R})`)}_basicDot(c){let{size:a,x:h,y:f}=c;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","circle"),this._element.setAttribute("cx",String(h+a/2)),this._element.setAttribute("cy",String(f+a/2)),this._element.setAttribute("r",String(a/2))}}))}_basicSquare(c){let{size:a,x:h,y:f}=c;this._rotateFigure(Object.assign(Object.assign({},c),{draw:()=>{this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","rect"),this._element.setAttribute("x",String(h)),this._element.setAttribute("y",String(f)),this._element.setAttribute("width",String(a)),this._element.setAttribute("height",String(a))}}))}_drawDot({x:c,y:a,size:h,rotation:f}){this._basicDot({x:c,y:a,size:h,rotation:f})}_drawSquare({x:c,y:a,size:h,rotation:f}){this._basicSquare({x:c,y:a,size:h,rotation:f})}}let L="circle",U=[[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,0,0,0,0,1],[1,0,0,0,0,0,1],[1,0,0,0,0,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]],G=[[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,1,1,1,0,0],[0,0,1,1,1,0,0],[0,0,1,1,1,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]];class ne{constructor(c,a){this._roundSize=h=>this._options.dotsOptions.roundSize?Math.floor(h):h,this._window=a,this._element=this._window.document.createElementNS("http://www.w3.org/2000/svg","svg"),this._element.setAttribute("width",String(c.width)),this._element.setAttribute("height",String(c.height)),this._element.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink"),c.dotsOptions.roundSize||this._element.setAttribute("shape-rendering","crispEdges"),this._element.setAttribute("viewBox",`0 0 ${c.width} ${c.height}`),this._defs=this._window.document.createElementNS("http://www.w3.org/2000/svg","defs"),this._element.appendChild(this._defs),this._imageUri=c.image,this._instanceId=ne.instanceCount++,this._options=c}get width(){return this._options.width}get height(){return this._options.height}getElement(){return this._element}async drawQR(c){let a=c.getModuleCount(),h=Math.min(this._options.width,this._options.height)-2*this._options.margin,f=this._options.shape===L?h/Math.sqrt(2):h,u=this._roundSize(f/a),v={hideXDots:0,hideYDots:0,width:0,height:0};if(this._qr=c,this._options.image){if(await this.loadImage(),!this._image)return;let{imageOptions:k,qrOptions:R}=this._options,N=k.imageSize*l[R.errorCorrectionLevel],M=Math.floor(N*a*a);v=(function({originalHeight:D,originalWidth:P,maxHiddenDots:$,maxHiddenAxisDots:j,dotSize:q}){let p={x:0,y:0},E={x:0,y:0};if(D<=0||P<=0||$<=0||q<=0)return{height:0,width:0,hideYDots:0,hideXDots:0};let y=D/P;return p.x=Math.floor(Math.sqrt($/y)),p.x<=0&&(p.x=1),j&&j<p.x&&(p.x=j),p.x%2==0&&p.x--,E.x=p.x*q,p.y=1+2*Math.ceil((p.x*y-1)/2),E.y=Math.round(E.x*y),(p.y*p.x>$||j&&j<p.y)&&(j&&j<p.y?(p.y=j,p.y%2==0&&p.x--):p.y-=2,E.y=p.y*q,p.x=1+2*Math.ceil((p.y/y-1)/2),E.x=Math.round(E.y/y)),{height:E.y,width:E.x,hideYDots:p.y,hideXDots:p.x}})({originalWidth:this._image.width,originalHeight:this._image.height,maxHiddenDots:M,maxHiddenAxisDots:a-14,dotSize:u})}this.drawBackground(),this.drawDots(((k,R)=>{var N,M,D,P,$,j;return!(this._options.imageOptions.hideBackgroundDots&&k>=(a-v.hideYDots)/2&&k<(a+v.hideYDots)/2&&R>=(a-v.hideXDots)/2&&R<(a+v.hideXDots)/2||!((N=U[k])===null||N===void 0)&&N[R]||!((M=U[k-a+7])===null||M===void 0)&&M[R]||!((D=U[k])===null||D===void 0)&&D[R-a+7]||!((P=G[k])===null||P===void 0)&&P[R]||!(($=G[k-a+7])===null||$===void 0)&&$[R]||!((j=G[k])===null||j===void 0)&&j[R-a+7])})),this.drawCorners(),this._options.image&&await this.drawImage({width:v.width,height:v.height,count:a,dotSize:u})}drawBackground(){var c,a,h;let f=this._element,u=this._options;if(f){let v=(c=u.backgroundOptions)===null||c===void 0?void 0:c.gradient,k=(a=u.backgroundOptions)===null||a===void 0?void 0:a.color,R=u.height,N=u.width;if(v||k){let M=this._window.document.createElementNS("http://www.w3.org/2000/svg","rect");this._backgroundClipPath=this._window.document.createElementNS("http://www.w3.org/2000/svg","clipPath"),this._backgroundClipPath.setAttribute("id",`clip-path-background-color-${this._instanceId}`),this._defs.appendChild(this._backgroundClipPath),!((h=u.backgroundOptions)===null||h===void 0)&&h.round&&(R=N=Math.min(u.width,u.height),M.setAttribute("rx",String(R/2*u.backgroundOptions.round))),M.setAttribute("x",String(this._roundSize((u.width-N)/2))),M.setAttribute("y",String(this._roundSize((u.height-R)/2))),M.setAttribute("width",String(N)),M.setAttribute("height",String(R)),this._backgroundClipPath.appendChild(M),this._createColor({options:v,color:k,additionalRotation:0,x:0,y:0,height:u.height,width:u.width,name:`background-color-${this._instanceId}`})}}}drawDots(c){var a,h;if(!this._qr)throw"QR code is not defined";let f=this._options,u=this._qr.getModuleCount();if(u>f.width||u>f.height)throw"The canvas is too small.";let v=Math.min(f.width,f.height)-2*f.margin,k=f.shape===L?v/Math.sqrt(2):v,R=this._roundSize(k/u),N=this._roundSize((f.width-u*R)/2),M=this._roundSize((f.height-u*R)/2),D=new d({svg:this._element,type:f.dotsOptions.type,window:this._window});this._dotsClipPath=this._window.document.createElementNS("http://www.w3.org/2000/svg","clipPath"),this._dotsClipPath.setAttribute("id",`clip-path-dot-color-${this._instanceId}`),this._defs.appendChild(this._dotsClipPath),this._createColor({options:(a=f.dotsOptions)===null||a===void 0?void 0:a.gradient,color:f.dotsOptions.color,additionalRotation:0,x:0,y:0,height:f.height,width:f.width,name:`dot-color-${this._instanceId}`});for(let P=0;P<u;P++)for(let $=0;$<u;$++)c&&!c(P,$)||!((h=this._qr)===null||h===void 0)&&h.isDark(P,$)&&(D.draw(N+$*R,M+P*R,R,((j,q)=>!($+j<0||P+q<0||$+j>=u||P+q>=u)&&!(c&&!c(P+q,$+j))&&!!this._qr&&this._qr.isDark(P+q,$+j))),D._element&&this._dotsClipPath&&this._dotsClipPath.appendChild(D._element));if(f.shape===L){let P=this._roundSize((v/R-u)/2),$=u+2*P,j=N-P*R,q=M-P*R,p=[],E=this._roundSize($/2);for(let y=0;y<$;y++){p[y]=[];for(let x=0;x<$;x++)y>=P-1&&y<=$-P&&x>=P-1&&x<=$-P||Math.sqrt((y-E)*(y-E)+(x-E)*(x-E))>E?p[y][x]=0:p[y][x]=this._qr.isDark(x-2*P<0?x:x>=u?x-2*P:x-P,y-2*P<0?y:y>=u?y-2*P:y-P)?1:0}for(let y=0;y<$;y++)for(let x=0;x<$;x++)p[y][x]&&(D.draw(j+x*R,q+y*R,R,((T,B)=>{var z;return!!(!((z=p[y+B])===null||z===void 0)&&z[x+T])})),D._element&&this._dotsClipPath&&this._dotsClipPath.appendChild(D._element))}}drawCorners(){if(!this._qr)throw"QR code is not defined";let c=this._element,a=this._options;if(!c)throw"Element code is not defined";let h=this._qr.getModuleCount(),f=Math.min(a.width,a.height)-2*a.margin,u=a.shape===L?f/Math.sqrt(2):f,v=this._roundSize(u/h),k=7*v,R=3*v,N=this._roundSize((a.width-h*v)/2),M=this._roundSize((a.height-h*v)/2);[[0,0,0],[1,0,Math.PI/2],[0,1,-Math.PI/2]].forEach((([D,P,$])=>{var j,q,p,E,y,x,T,B,z,H,K,W,Z,ue;let ie=N+D*v*(h-7),ee=M+P*v*(h-7),Q=this._dotsClipPath,F=this._dotsClipPath;if((!((j=a.cornersSquareOptions)===null||j===void 0)&&j.gradient||!((q=a.cornersSquareOptions)===null||q===void 0)&&q.color)&&(Q=this._window.document.createElementNS("http://www.w3.org/2000/svg","clipPath"),Q.setAttribute("id",`clip-path-corners-square-color-${D}-${P}-${this._instanceId}`),this._defs.appendChild(Q),this._cornersSquareClipPath=this._cornersDotClipPath=F=Q,this._createColor({options:(p=a.cornersSquareOptions)===null||p===void 0?void 0:p.gradient,color:(E=a.cornersSquareOptions)===null||E===void 0?void 0:E.color,additionalRotation:$,x:ie,y:ee,height:k,width:k,name:`corners-square-color-${D}-${P}-${this._instanceId}`})),((y=a.cornersSquareOptions)===null||y===void 0?void 0:y.type)&&S.includes(a.cornersSquareOptions.type)){let re=new w({svg:this._element,type:a.cornersSquareOptions.type,window:this._window});re.draw(ie,ee,k,$),re._element&&Q&&Q.appendChild(re._element)}else{let re=new d({svg:this._element,type:((x=a.cornersSquareOptions)===null||x===void 0?void 0:x.type)||a.dotsOptions.type,window:this._window});for(let le=0;le<U.length;le++)for(let V=0;V<U[le].length;V++)!((T=U[le])===null||T===void 0)&&T[V]&&(re.draw(ie+V*v,ee+le*v,v,((be,me)=>{var fe;return!!(!((fe=U[le+me])===null||fe===void 0)&&fe[V+be])})),re._element&&Q&&Q.appendChild(re._element))}if((!((B=a.cornersDotOptions)===null||B===void 0)&&B.gradient||!((z=a.cornersDotOptions)===null||z===void 0)&&z.color)&&(F=this._window.document.createElementNS("http://www.w3.org/2000/svg","clipPath"),F.setAttribute("id",`clip-path-corners-dot-color-${D}-${P}-${this._instanceId}`),this._defs.appendChild(F),this._cornersDotClipPath=F,this._createColor({options:(H=a.cornersDotOptions)===null||H===void 0?void 0:H.gradient,color:(K=a.cornersDotOptions)===null||K===void 0?void 0:K.color,additionalRotation:$,x:ie+2*v,y:ee+2*v,height:R,width:R,name:`corners-dot-color-${D}-${P}-${this._instanceId}`})),((W=a.cornersDotOptions)===null||W===void 0?void 0:W.type)&&_.includes(a.cornersDotOptions.type)){let re=new I({svg:this._element,type:a.cornersDotOptions.type,window:this._window});re.draw(ie+2*v,ee+2*v,R,$),re._element&&F&&F.appendChild(re._element)}else{let re=new d({svg:this._element,type:((Z=a.cornersDotOptions)===null||Z===void 0?void 0:Z.type)||a.dotsOptions.type,window:this._window});for(let le=0;le<G.length;le++)for(let V=0;V<G[le].length;V++)!((ue=G[le])===null||ue===void 0)&&ue[V]&&(re.draw(ie+V*v,ee+le*v,v,((be,me)=>{var fe;return!!(!((fe=G[le+me])===null||fe===void 0)&&fe[V+be])})),re._element&&F&&F.appendChild(re._element))}}))}loadImage(){return new Promise(((c,a)=>{var h;let f=this._options;if(!f.image)return a("Image is not defined");if(!((h=f.nodeCanvas)===null||h===void 0)&&h.loadImage)f.nodeCanvas.loadImage(f.image).then((u=>{var v,k;if(this._image=u,this._options.imageOptions.saveAsBlob){let R=(v=f.nodeCanvas)===null||v===void 0?void 0:v.createCanvas(this._image.width,this._image.height);(k=R?.getContext("2d"))===null||k===void 0||k.drawImage(u,0,0),this._imageUri=R?.toDataURL()}c()})).catch(a);else{let u=new this._window.Image;typeof f.imageOptions.crossOrigin=="string"&&(u.crossOrigin=f.imageOptions.crossOrigin),this._image=u,u.onload=async()=>{this._options.imageOptions.saveAsBlob&&(this._imageUri=await(async function(v,k){return new Promise((R=>{let N=new k.XMLHttpRequest;N.onload=function(){let M=new k.FileReader;M.onloadend=function(){R(M.result)},M.readAsDataURL(N.response)},N.open("GET",v),N.responseType="blob",N.send()}))})(f.image||"",this._window)),c()},u.src=f.image}}))}async drawImage({width:c,height:a,count:h,dotSize:f}){let u=this._options,v=this._roundSize((u.width-h*f)/2),k=this._roundSize((u.height-h*f)/2),R=v+this._roundSize(u.imageOptions.margin+(h*f-c)/2),N=k+this._roundSize(u.imageOptions.margin+(h*f-a)/2),M=c-2*u.imageOptions.margin,D=a-2*u.imageOptions.margin,P=this._window.document.createElementNS("http://www.w3.org/2000/svg","image");P.setAttribute("href",this._imageUri||""),P.setAttribute("xlink:href",this._imageUri||""),P.setAttribute("x",String(R)),P.setAttribute("y",String(N)),P.setAttribute("width",`${M}px`),P.setAttribute("height",`${D}px`),this._element.appendChild(P)}_createColor({options:c,color:a,additionalRotation:h,x:f,y:u,height:v,width:k,name:R}){let N=k>v?k:v,M=this._window.document.createElementNS("http://www.w3.org/2000/svg","rect");if(M.setAttribute("x",String(f)),M.setAttribute("y",String(u)),M.setAttribute("height",String(v)),M.setAttribute("width",String(k)),M.setAttribute("clip-path",`url('#clip-path-${R}')`),c){let D;if(c.type==="radial")D=this._window.document.createElementNS("http://www.w3.org/2000/svg","radialGradient"),D.setAttribute("id",R),D.setAttribute("gradientUnits","userSpaceOnUse"),D.setAttribute("fx",String(f+k/2)),D.setAttribute("fy",String(u+v/2)),D.setAttribute("cx",String(f+k/2)),D.setAttribute("cy",String(u+v/2)),D.setAttribute("r",String(N/2));else{let P=((c.rotation||0)+h)%(2*Math.PI),$=(P+2*Math.PI)%(2*Math.PI),j=f+k/2,q=u+v/2,p=f+k/2,E=u+v/2;$>=0&&$<=.25*Math.PI||$>1.75*Math.PI&&$<=2*Math.PI?(j-=k/2,q-=v/2*Math.tan(P),p+=k/2,E+=v/2*Math.tan(P)):$>.25*Math.PI&&$<=.75*Math.PI?(q-=v/2,j-=k/2/Math.tan(P),E+=v/2,p+=k/2/Math.tan(P)):$>.75*Math.PI&&$<=1.25*Math.PI?(j+=k/2,q+=v/2*Math.tan(P),p-=k/2,E-=v/2*Math.tan(P)):$>1.25*Math.PI&&$<=1.75*Math.PI&&(q+=v/2,j+=k/2/Math.tan(P),E-=v/2,p-=k/2/Math.tan(P)),D=this._window.document.createElementNS("http://www.w3.org/2000/svg","linearGradient"),D.setAttribute("id",R),D.setAttribute("gradientUnits","userSpaceOnUse"),D.setAttribute("x1",String(Math.round(j))),D.setAttribute("y1",String(Math.round(q))),D.setAttribute("x2",String(Math.round(p))),D.setAttribute("y2",String(Math.round(E)))}c.colorStops.forEach((({offset:P,color:$})=>{let j=this._window.document.createElementNS("http://www.w3.org/2000/svg","stop");j.setAttribute("offset",100*P+"%"),j.setAttribute("stop-color",$),D.appendChild(j)})),M.setAttribute("fill",`url('#${R}')`),this._defs.appendChild(D)}else a&&M.setAttribute("fill",a);this._element.appendChild(M)}}ne.instanceCount=0;let _e=ne,ve="canvas",pe={};for(let b=0;b<=40;b++)pe[b]=b;let he={type:ve,shape:"square",width:300,height:300,data:"",margin:0,qrOptions:{typeNumber:pe[0],mode:void 0,errorCorrectionLevel:"Q"},imageOptions:{saveAsBlob:!0,hideBackgroundDots:!0,imageSize:.4,crossOrigin:void 0,margin:0},dotsOptions:{type:"square",color:"#000",roundSize:!0},backgroundOptions:{round:0,color:"#fff"}};function de(b){let c=Object.assign({},b);if(!c.colorStops||!c.colorStops.length)throw"Field 'colorStops' is required in gradient";return c.rotation?c.rotation=Number(c.rotation):c.rotation=0,c.colorStops=c.colorStops.map((a=>Object.assign(Object.assign({},a),{offset:Number(a.offset)}))),c}function Ee(b){let c=Object.assign({},b);return c.width=Number(c.width),c.height=Number(c.height),c.margin=Number(c.margin),c.imageOptions=Object.assign(Object.assign({},c.imageOptions),{hideBackgroundDots:!!c.imageOptions.hideBackgroundDots,imageSize:Number(c.imageOptions.imageSize),margin:Number(c.imageOptions.margin)}),c.margin>Math.min(c.width,c.height)&&(c.margin=Math.min(c.width,c.height)),c.dotsOptions=Object.assign({},c.dotsOptions),c.dotsOptions.gradient&&(c.dotsOptions.gradient=de(c.dotsOptions.gradient)),c.cornersSquareOptions&&(c.cornersSquareOptions=Object.assign({},c.cornersSquareOptions),c.cornersSquareOptions.gradient&&(c.cornersSquareOptions.gradient=de(c.cornersSquareOptions.gradient))),c.cornersDotOptions&&(c.cornersDotOptions=Object.assign({},c.cornersDotOptions),c.cornersDotOptions.gradient&&(c.cornersDotOptions.gradient=de(c.cornersDotOptions.gradient))),c.backgroundOptions&&(c.backgroundOptions=Object.assign({},c.backgroundOptions),c.backgroundOptions.gradient&&(c.backgroundOptions.gradient=de(c.backgroundOptions.gradient))),c}var xe=t(873),Ae=t.n(xe);function Le(b){if(!b)throw new Error("Extension must be defined");b[0]==="."&&(b=b.substring(1));let c={bmp:"image/bmp",gif:"image/gif",ico:"image/vnd.microsoft.icon",jpeg:"image/jpeg",jpg:"image/jpeg",png:"image/png",svg:"image/svg+xml",tif:"image/tiff",tiff:"image/tiff",webp:"image/webp",pdf:"application/pdf"}[b.toLowerCase()];if(!c)throw new Error(`Extension "${b}" is not supported`);return c}class C{constructor(c){c?.jsdom?this._window=new c.jsdom("",{resources:"usable"}).window:this._window=window,this._options=c?Ee(o(he,c)):he,this.update()}static _clearContainer(c){c&&(c.innerHTML="")}_setupSvg(){if(!this._qr)return;let c=new _e(this._options,this._window);this._svg=c.getElement(),this._svgDrawingPromise=c.drawQR(this._qr).then((()=>{var a;this._svg&&((a=this._extension)===null||a===void 0||a.call(this,c.getElement(),this._options))}))}_setupCanvas(){var c,a;this._qr&&(!((c=this._options.nodeCanvas)===null||c===void 0)&&c.createCanvas?(this._nodeCanvas=this._options.nodeCanvas.createCanvas(this._options.width,this._options.height),this._nodeCanvas.width=this._options.width,this._nodeCanvas.height=this._options.height):(this._domCanvas=document.createElement("canvas"),this._domCanvas.width=this._options.width,this._domCanvas.height=this._options.height),this._setupSvg(),this._canvasDrawingPromise=(a=this._svgDrawingPromise)===null||a===void 0?void 0:a.then((()=>{var h;if(!this._svg)return;let f=this._svg,u=new this._window.XMLSerializer().serializeToString(f),v=btoa(u),k=`data:${Le("svg")};base64,${v}`;if(!((h=this._options.nodeCanvas)===null||h===void 0)&&h.loadImage)return this._options.nodeCanvas.loadImage(k).then((R=>{var N,M;R.width=this._options.width,R.height=this._options.height,(M=(N=this._nodeCanvas)===null||N===void 0?void 0:N.getContext("2d"))===null||M===void 0||M.drawImage(R,0,0)}));{let R=new this._window.Image;return new Promise((N=>{R.onload=()=>{var M,D;(D=(M=this._domCanvas)===null||M===void 0?void 0:M.getContext("2d"))===null||D===void 0||D.drawImage(R,0,0),N()},R.src=k}))}})))}async _getElement(c="png"){if(!this._qr)throw"QR code is empty";return c.toLowerCase()==="svg"?(this._svg&&this._svgDrawingPromise||this._setupSvg(),await this._svgDrawingPromise,this._svg):((this._domCanvas||this._nodeCanvas)&&this._canvasDrawingPromise||this._setupCanvas(),await this._canvasDrawingPromise,this._domCanvas||this._nodeCanvas)}update(c){C._clearContainer(this._container),this._options=c?Ee(o(this._options,c)):this._options,this._options.data&&(this._qr=Ae()(this._options.qrOptions.typeNumber,this._options.qrOptions.errorCorrectionLevel),this._qr.addData(this._options.data,this._options.qrOptions.mode||(function(a){switch(!0){case/^[0-9]*$/.test(a):return"Numeric";case/^[0-9A-Z $%*+\-./:]*$/.test(a):return"Alphanumeric";default:return"Byte"}})(this._options.data)),this._qr.make(),this._options.type===ve?this._setupCanvas():this._setupSvg(),this.append(this._container))}append(c){if(c){if(typeof c.appendChild!="function")throw"Container should be a single DOM node";this._options.type===ve?this._domCanvas&&c.appendChild(this._domCanvas):this._svg&&c.appendChild(this._svg),this._container=c}}applyExtension(c){if(!c)throw"Extension function should be defined.";this._extension=c,this.update()}deleteExtension(){this._extension=void 0,this.update()}async getRawData(c="png"){if(!this._qr)throw"QR code is empty";let a=await this._getElement(c),h=Le(c);if(!a)return null;if(c.toLowerCase()==="svg"){let f=`<?xml version="1.0" standalone="no"?>\r
${new this._window.XMLSerializer().serializeToString(a)}`;return typeof Blob>"u"||this._options.jsdom?Buffer.from(f):new Blob([f],{type:h})}return new Promise((f=>{let u=a;if("toBuffer"in u)if(h==="image/png")f(u.toBuffer(h));else if(h==="image/jpeg")f(u.toBuffer(h));else{if(h!=="application/pdf")throw Error("Unsupported extension");f(u.toBuffer(h))}else"toBlob"in u&&u.toBlob(f,h,1)}))}async download(c){if(!this._qr)throw"QR code is empty";if(typeof Blob>"u")throw"Cannot download in Node.js, call getRawData instead.";let a="png",h="qr";typeof c=="string"?(a=c,console.warn("Extension is deprecated as argument for 'download' method, please pass object { name: '...', extension: '...' } as argument")):typeof c=="object"&&c!==null&&(c.name&&(h=c.name),c.extension&&(a=c.extension));let f=await this._getElement(a);if(f)if(a.toLowerCase()==="svg"){let u=new XMLSerializer().serializeToString(f);u=`<?xml version="1.0" standalone="no"?>\r
`+u,s(`data:${Le(a)};charset=utf-8,${encodeURIComponent(u)}`,`${h}.svg`)}else s(f.toDataURL(Le(a)),`${h}.${a}`)}}let A=C})(),r.default})()))});function Zo(){if(typeof globalThis<"u")return globalThis;if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global}function es(){let n=Zo();if(n.__xstate__)return n.__xstate__}var Dr=n=>{if(typeof window>"u")return;let e=es();e&&e.register(n)};var Wt=class{constructor(e){this._process=e,this._active=!1,this._current=null,this._last=null}start(){this._active=!0,this.flush()}clear(){this._current&&(this._current.next=null,this._last=this._current)}enqueue(e){let t={value:e,next:null};if(this._current){this._last.next=t,this._last=t;return}this._current=t,this._last=t,this._active&&this.flush()}flush(){for(;this._current;){let e=this._current;this._process(e.value),this._current=e.next}this._last=null}},Dn=".",ts="",Bn="",ns="#",rs="*",zr="xstate.init";var _t="xstate.stop";function is(n,e){return{type:`xstate.after.${n}.${e}`}}function Pn(n,e){return{type:`xstate.done.state.${n}`,output:e}}function os(n,e){return{type:`xstate.done.actor.${n}`,output:e,actorId:n}}function ss(n,e){return{type:`xstate.error.actor.${n}`,error:e,actorId:n}}function $n(n){return{type:zr,input:n}}function Re(n){setTimeout(()=>{throw n})}var as=typeof Symbol=="function"&&Symbol.observable||"@@observable";function Un(n,e){let t=Br(n),r=Br(e);return typeof r=="string"?typeof t=="string"?r===t:!1:typeof t=="string"?t in r:Object.keys(t).every(i=>i in r?Un(t[i],r[i]):!1)}function Jt(n){if(Gr(n))return n;let e=[],t="";for(let r=0;r<n.length;r++){switch(n.charCodeAt(r)){case 92:t+=n[r+1],r++;continue;case 46:e.push(t),t="";continue}t+=n[r]}return e.push(t),e}function Br(n){if(hi(n))return n.value;if(typeof n!="string")return n;let e=Jt(n);return Vr(e)}function Vr(n){if(n.length===1)return n[0];let e={},t=e;for(let r=0;r<n.length-1;r++)if(r===n.length-2)t[n[r]]=n[r+1];else{let i=t;t={},i[n[r]]=t}return e}function Fn(n,e){let t={},r=Object.keys(n);for(let i=0;i<r.length;i++){let o=r[i];t[o]=e(n[o],o,n,i)}return t}function Hr(n){return Gr(n)?n:[n]}function De(n){return n===void 0?[]:Hr(n)}function On(n,e,t,r){return typeof n=="function"?n({context:e,event:t,self:r}):n}function Gr(n){return Array.isArray(n)}function cs(n){return n.type.startsWith("xstate.error.actor")}function We(n){return Hr(n).map(e=>typeof e>"u"||typeof e=="string"?{target:e}:e)}function jr(n){if(!(n===void 0||n===ts))return De(n)}function bt(n,e,t){let r=typeof n=="object",i=r?n:void 0;return{next:(r?n.next:n)?.bind(i),error:(r?n.error:e)?.bind(i),complete:(r?n.complete:t)?.bind(i)}}function qn(n,e){return`${e}.${n}`}function xt(n,e){let t=e.match(/^xstate\.invoke\.(\d+)\.(.*)/);if(!t)return n.implementations.actors[e];let[,r,i]=t,s=n.getStateNodeById(i).config.invoke;return(Array.isArray(s)?s[r]:s).src}function ls(n,e){if(e===n||e===rs)return!0;if(!e.endsWith(".*"))return!1;let t=e.split("."),r=n.split(".");for(let i=0;i<t.length;i++){let o=t[i],s=r[i];if(o==="*")return i===t.length-1;if(o!==s)return!1}return!0}function $r(n,e){return`${n.sessionId}.${e}`}var ds=0;function us(n,e){let t=new Map,r=new Map,i=new WeakMap,o=new Set,s={},{clock:l,logger:d}=e,g={schedule:(m,_,I,L,U=Math.random().toString(36).slice(2))=>{let G={source:m,target:_,event:I,delay:L,id:U,startedAt:Date.now()},ne=$r(m,U);w._snapshot._scheduledEvents[ne]=G;let _e=l.setTimeout(()=>{delete s[ne],delete w._snapshot._scheduledEvents[ne],w._relay(m,_,I)},L);s[ne]=_e},cancel:(m,_)=>{let I=$r(m,_),L=s[I];delete s[I],delete w._snapshot._scheduledEvents[I],L!==void 0&&l.clearTimeout(L)},cancelAll:m=>{for(let _ in w._snapshot._scheduledEvents){let I=w._snapshot._scheduledEvents[_];I.source===m&&g.cancel(m,I.id)}}},S=m=>{if(!o.size)return;let _={...m,rootId:n.sessionId};o.forEach(I=>I.next?.(_))},w={_snapshot:{_scheduledEvents:(e?.snapshot&&e.snapshot.scheduler)??{}},_bookId:()=>`x:${ds++}`,_register:(m,_)=>(t.set(m,_),m),_unregister:m=>{t.delete(m.sessionId);let _=i.get(m);_!==void 0&&(r.delete(_),i.delete(m))},get:m=>r.get(m),getAll:()=>Object.fromEntries(r.entries()),_set:(m,_)=>{let I=r.get(m);if(I&&I!==_)throw new Error(`Actor with system ID '${m}' already exists.`);r.set(m,_),i.set(_,m)},inspect:m=>{let _=bt(m);return o.add(_),{unsubscribe(){o.delete(_)}}},_sendInspectionEvent:S,_relay:(m,_,I)=>{w._sendInspectionEvent({type:"@xstate.event",sourceRef:m,actorRef:_,event:I}),_._send(I)},scheduler:g,getSnapshot:()=>({_scheduledEvents:{...w._snapshot._scheduledEvents}}),start:()=>{let m=w._snapshot._scheduledEvents;w._snapshot._scheduledEvents={};for(let _ in m){let{source:I,target:L,event:U,delay:G,id:ne}=m[_];g.schedule(I,L,U,G,ne)}},_clock:l,_logger:d};return w}var kn=!1,Yt=1,ye=(function(n){return n[n.NotStarted=0]="NotStarted",n[n.Running=1]="Running",n[n.Stopped=2]="Stopped",n})({}),hs={clock:{setTimeout:(n,e)=>setTimeout(n,e),clearTimeout:n=>clearTimeout(n)},logger:console.log.bind(console),devTools:!1},Qt=class{constructor(e,t){this.logic=e,this._snapshot=void 0,this.clock=void 0,this.options=void 0,this.id=void 0,this.mailbox=new Wt(this._process.bind(this)),this.observers=new Set,this.eventListeners=new Map,this.logger=void 0,this._processingStatus=ye.NotStarted,this._parent=void 0,this._syncSnapshot=void 0,this.ref=void 0,this._actorScope=void 0,this.systemId=void 0,this.sessionId=void 0,this.system=void 0,this._doneEvent=void 0,this.src=void 0,this._deferred=[];let r={...hs,...t},{clock:i,logger:o,parent:s,syncSnapshot:l,id:d,systemId:g,inspect:S}=r;this.system=s?s.system:us(this,{clock:i,logger:o}),S&&!s&&this.system.inspect(bt(S)),this.sessionId=this.system._bookId(),this.id=d??this.sessionId,this.logger=t?.logger??this.system._logger,this.clock=t?.clock??this.system._clock,this._parent=s,this._syncSnapshot=l,this.options=r,this.src=r.src??e,this.ref=this,this._actorScope={self:this,id:this.id,sessionId:this.sessionId,logger:this.logger,defer:w=>{this._deferred.push(w)},system:this.system,stopChild:w=>{if(w._parent!==this)throw new Error(`Cannot stop child actor ${w.id} of ${this.id} because it is not a child`);w._stop()},emit:w=>{let m=this.eventListeners.get(w.type),_=this.eventListeners.get("*");if(!m&&!_)return;let I=[...m?m.values():[],..._?_.values():[]];for(let L of I)try{L(w)}catch(U){Re(U)}},actionExecutor:w=>{let m=()=>{if(this._actorScope.system._sendInspectionEvent({type:"@xstate.action",actorRef:this,action:{type:w.type,params:w.params}}),!w.exec)return;let _=kn;try{kn=!0,w.exec(w.info,w.params)}finally{kn=_}};this._processingStatus===ye.Running?m():this._deferred.push(m)}},this.send=this.send.bind(this),this.system._sendInspectionEvent({type:"@xstate.actor",actorRef:this}),g&&(this.systemId=g,this.system._set(g,this)),this._initState(t?.snapshot??t?.state),g&&this._snapshot.status!=="active"&&this.system._unregister(this)}_initState(e){try{this._snapshot=e?this.logic.restoreSnapshot?this.logic.restoreSnapshot(e,this._actorScope):e:this.logic.getInitialSnapshot(this._actorScope,this.options?.input)}catch(t){this._snapshot={status:"error",output:void 0,error:t}}}update(e,t){this._snapshot=e;let r;for(;r=this._deferred.shift();)try{r()}catch(i){this._deferred.length=0,this._snapshot={...e,status:"error",error:i}}switch(this._snapshot.status){case"active":for(let i of this.observers)try{i.next?.(e)}catch(o){Re(o)}break;case"done":for(let i of this.observers)try{i.next?.(e)}catch(o){Re(o)}this._stopProcedure(),this._complete(),this._doneEvent=os(this.id,this._snapshot.output),this._parent&&this.system._relay(this,this._parent,this._doneEvent);break;case"error":this._error(this._snapshot.error);break}this.system._sendInspectionEvent({type:"@xstate.snapshot",actorRef:this,event:t,snapshot:e})}subscribe(e,t,r){let i=bt(e,t,r);if(this._processingStatus!==ye.Stopped)this.observers.add(i);else switch(this._snapshot.status){case"done":try{i.complete?.()}catch(o){Re(o)}break;case"error":{let o=this._snapshot.error;if(!i.error)Re(o);else try{i.error(o)}catch(s){Re(s)}break}}return{unsubscribe:()=>{this.observers.delete(i)}}}on(e,t){let r=this.eventListeners.get(e);r||(r=new Set,this.eventListeners.set(e,r));let i=t.bind(void 0);return r.add(i),{unsubscribe:()=>{r.delete(i)}}}select(e,t=Object.is){return{subscribe:r=>{let i=bt(r),o=this.getSnapshot(),s=e(o);return this.subscribe(l=>{let d=e(l);t(s,d)||(s=d,i.next?.(d))})},get:()=>e(this.getSnapshot())}}start(){if(this._processingStatus===ye.Running)return this;this._syncSnapshot&&this.subscribe({next:r=>{r.status==="active"&&this.system._relay(this,this._parent,{type:`xstate.snapshot.${this.id}`,snapshot:r})},error:()=>{}}),this.system._register(this.sessionId,this),this.systemId&&this.system._set(this.systemId,this),this._processingStatus=ye.Running;let e=$n(this.options.input);switch(this.system._sendInspectionEvent({type:"@xstate.event",sourceRef:this._parent,actorRef:this,event:e}),this._snapshot.status){case"done":return this.update(this._snapshot,e),this;case"error":return this._error(this._snapshot.error),this}if(this._parent||this.system.start(),this.logic.start)try{this.logic.start(this._snapshot,this._actorScope)}catch(r){return this._snapshot={...this._snapshot,status:"error",error:r},this._error(r),this}return this.update(this._snapshot,e),this.options.devTools&&this.attachDevTools(),this.mailbox.start(),this}_process(e){let t,r;try{t=this.logic.transition(this._snapshot,e,this._actorScope)}catch(i){r={err:i}}if(r){let{err:i}=r;this._snapshot={...this._snapshot,status:"error",error:i},this._error(i);return}this.update(t,e),e.type===_t&&(this._stopProcedure(),this._complete())}_stop(){return this._processingStatus===ye.Stopped?this:(this.mailbox.clear(),this._processingStatus===ye.NotStarted?(this._processingStatus=ye.Stopped,this):(this.mailbox.enqueue({type:_t}),this))}stop(){if(this._parent)throw new Error("A non-root actor cannot be stopped directly.");return this._stop()}_complete(){for(let e of this.observers)try{e.complete?.()}catch(t){Re(t)}this.observers.clear(),this.eventListeners.clear()}_reportError(e){if(!this.observers.size){this._parent||Re(e),this.eventListeners.clear();return}let t=!1;for(let r of this.observers){let i=r.error;t||=!i;try{i?.(e)}catch(o){Re(o)}}this.observers.clear(),this.eventListeners.clear(),t&&Re(e)}_error(e){this._stopProcedure(),this._reportError(e),this._parent&&this.system._relay(this,this._parent,ss(this.id,e))}_stopProcedure(){return this._processingStatus!==ye.Running?this:(this.system.scheduler.cancelAll(this),this.mailbox.clear(),this.mailbox=new Wt(this._process.bind(this)),this._processingStatus=ye.Stopped,this.system._unregister(this),this)}_send(e){this._processingStatus!==ye.Stopped&&this.mailbox.enqueue(e)}send(e){this.system._relay(void 0,this,e)}attachDevTools(){let{devTools:e}=this.options;e&&(typeof e=="function"?e:Dr)(this)}toJSON(){return{xstate$$type:Yt,id:this.id}}getPersistedSnapshot(e){return this.logic.getPersistedSnapshot(this._snapshot,e)}[as](){return this}getSnapshot(){return this._snapshot}};function ke(n,...[e]){return new Qt(n,e)}function fs(n,e,t,r,{sendId:i}){let o=typeof i=="function"?i(t,r):i;return[e,{sendId:o},void 0]}function gs(n,e){n.defer(()=>{n.system.scheduler.cancel(n.self,e.sendId)})}function Kr(n){function e(t,r){}return e.type="xstate.cancel",e.sendId=n,e.resolve=fs,e.execute=gs,e}function ps(n,e,t,r,{id:i,systemId:o,src:s,input:l,syncSnapshot:d}){let g=typeof s=="string"?xt(e.machine,s):s,S=typeof i=="function"?i(t):i,w,m;return g&&(m=typeof l=="function"?l({context:e.context,event:t.event,self:n.self}):l,w=ke(g,{id:S,src:s,parent:n.self,syncSnapshot:d,systemId:o,input:m})),[Ue(e,{children:{...e.children,[S]:w}}),{id:i,systemId:o,actorRef:w,src:s,input:m},void 0]}function ms(n,{actorRef:e}){e&&n.defer(()=>{e._processingStatus!==ye.Stopped&&e.start()})}function Wr(...[n,{id:e,systemId:t,input:r,syncSnapshot:i=!1}={}]){function o(s,l){}return o.type="xstate.spawnChild",o.id=e,o.systemId=t,o.src=n,o.input=r,o.syncSnapshot=i,o.resolve=ps,o.execute=ms,o}function ys(n,e,t,r,{actorRef:i}){let o=typeof i=="function"?i(t,r):i,s=typeof o=="string"?e.children[o]:o,l=e.children;return s&&(l={...l},delete l[s.id]),[Ue(e,{children:l}),s,void 0]}function Qr(n,e){let t=e.getSnapshot();if(t&&"children"in t)for(let r of Object.values(t.children))Qr(n,r);n.system._unregister(e)}function ws(n,e){if(e){if(Qr(n,e),e._processingStatus!==ye.Running){n.stopChild(e);return}n.defer(()=>{n.stopChild(e)})}}function zn(n){function e(t,r){}return e.type="xstate.stopChild",e.actorRef=n,e.resolve=ys,e.execute=ws,e}function Xt(n,e,t,r){let{machine:i}=r,o=typeof n=="function",s=o?n:i.implementations.guards[typeof n=="string"?n:n.type];if(!o&&!s)throw new Error(`Guard '${typeof n=="string"?n:n.type}' is not implemented.'.`);if(typeof s!="function")return Xt(s,e,t,r);let l={context:e,event:t},d=o||typeof n=="string"?void 0:"params"in n?typeof n.params=="function"?n.params({context:e,event:t}):n.params:void 0;return"check"in s?s.check(r,l,s):s(l,d)}function Vn(n){return n.type==="atomic"||n.type==="final"}function rt(n){return Object.values(n.states).filter(e=>e.type!=="history")}function St(n,e){let t=[];if(e===n)return t;let r=n.parent;for(;r&&r!==e;)t.push(r),r=r.parent;return t}function At(n){let e=new Set(n),t=Yr(e);for(let r of e)if(r.type==="compound"&&(!t.get(r)||!t.get(r).length))Ur(r).forEach(i=>e.add(i));else if(r.type==="parallel"){for(let i of rt(r))if(i.type!=="history"&&!e.has(i)){let o=Ur(i);for(let s of o)e.add(s)}}for(let r of e){let i=r.parent;for(;i;)e.add(i),i=i.parent}return e}function Jr(n,e){let t=e.get(n);if(!t)return{};if(n.type==="compound"){let i=t[0];if(i){if(Vn(i))return i.key}else return{}}let r={};for(let i of t)r[i.key]=Jr(i,e);return r}function Yr(n){let e=new Map;for(let t of n)e.has(t)||e.set(t,[]),t.parent&&(e.has(t.parent)||e.set(t.parent,[]),e.get(t.parent).push(t));return e}function Xr(n,e){let t=At(e);return Jr(n,Yr(t))}function Zt(n,e){return e.type==="compound"?rt(e).some(t=>t.type==="final"&&n.has(t)):e.type==="parallel"?rt(e).every(t=>Zt(n,t)):e.type==="final"}var It=n=>n[0]===ns;function Zr(n,e){return n.transitions.get(e)||[...n.transitions.keys()].filter(r=>ls(e,r)).sort((r,i)=>i.length-r.length).flatMap(r=>n.transitions.get(r))}function ei(n){let e=n.config.after;if(!e)return[];let t=i=>{let o=is(i,n.id),s=o.type;return n.entry.push(pi(o,{id:s,delay:i})),n.exit.push(Kr(s)),s};return Object.keys(e).flatMap(i=>{let o=e[i],s=typeof o=="string"?{target:o}:o,l=Number.isNaN(+i)?i:+i,d=t(l);return De(s).map(g=>({...g,event:d,delay:l}))}).map(i=>{let{delay:o}=i;return{...Ne(n,i.event,i),delay:o}})}function Ne(n,e,t){let r=jr(t.target),i=t.reenter??!1,o=vs(n,r),s={...t,actions:De(t.actions),guard:t.guard,target:o,source:n,reenter:i,eventType:e,toJSON:()=>({...s,source:`#${n.id}`,target:o?o.map(l=>`#${l.id}`):void 0})};return s}function ti(n){let e=new Map;if(n.config.on)for(let t of Object.keys(n.config.on)){if(t===Bn)throw new Error('Null events ("") cannot be specified as a transition key. Use `always: { ... }` instead.');let r=n.config.on[t];e.set(t,We(r).map(i=>Ne(n,t,i)))}if(n.config.onDone){let t=`xstate.done.state.${n.id}`;e.set(t,We(n.config.onDone).map(r=>Ne(n,t,r)))}for(let t of n.invoke){if(t.onDone){let r=`xstate.done.actor.${t.id}`;e.set(r,We(t.onDone).map(i=>Ne(n,r,i)))}if(t.onError){let r=`xstate.error.actor.${t.id}`;e.set(r,We(t.onError).map(i=>Ne(n,r,i)))}if(t.onSnapshot){let r=`xstate.snapshot.${t.id}`;e.set(r,We(t.onSnapshot).map(i=>Ne(n,r,i)))}}for(let t of n.after){let r=e.get(t.eventType);r||(r=[],e.set(t.eventType,r)),r.push(t)}return e}function ni(n){let e=[],t=r=>{Object.values(r).forEach(i=>{if(i.config.route&&i.config.id){let o=i.config.id,s=i.config.route.guard,l=(g,S)=>g.event.to!==`#${o}`?!1:s&&typeof s=="function"?s(g,S):!0,d={...i.config.route,guard:l,target:`#${o}`};e.push(Ne(n,"xstate.route",d))}i.states&&t(i.states)})};t(n.states),e.length>0&&n.transitions.set("xstate.route",e)}function ri(n,e){let t=typeof e=="string"?n.states[e]:e?n.states[e.target]:void 0;if(!t&&e)throw new Error(`Initial state node "${e}" not found on parent state node #${n.id}`);let r={source:n,actions:!e||typeof e=="string"?[]:De(e.actions),eventType:null,reenter:!1,target:t?[t]:[],toJSON:()=>({...r,source:`#${n.id}`,target:t?[`#${t.id}`]:[]})};return r}function vs(n,e){if(e!==void 0)return e.map(t=>{if(typeof t!="string")return t;if(It(t))return n.machine.getStateNodeById(t);let r=t[0]===Dn;if(r&&!n.parent)return Et(n,t.slice(1));let i=r?n.key+t:t;if(n.parent)try{return Et(n.parent,i)}catch(o){throw new Error(`Invalid transition definition for state node '${n.id}':
${o.message}`)}else throw new Error(`Invalid target: "${t}" is not a valid target from the root node. Did you mean ".${t}"?`)})}function ii(n){let e=jr(n.config.target);return e?{target:e.map(t=>typeof t=="string"?Et(n.parent,t):t)}:n.parent.initial}function Qe(n){return n.type==="history"}function Ur(n){let e=oi(n);for(let t of e)for(let r of St(t,n))e.add(r);return e}function oi(n){let e=new Set;function t(r){if(!e.has(r)){if(e.add(r),r.type==="compound")t(r.initial.target[0]);else if(r.type==="parallel")for(let i of rt(r))t(i)}}return t(n),e}function it(n,e){if(It(e))return n.machine.getStateNodeById(e);if(!n.states)throw new Error(`Unable to retrieve child state '${e}' from '${n.id}'; no child states exist.`);let t=n.states[e];if(!t)throw new Error(`Child state '${e}' does not exist on '${n.id}'`);return t}function Et(n,e){if(typeof e=="string"&&It(e))try{return n.machine.getStateNodeById(e)}catch{}let t=Jt(e).slice(),r=n;for(;t.length;){let i=t.shift();if(!i.length)break;r=it(r,i)}return r}function ot(n,e){if(typeof e=="string"){let i=n.states[e];if(!i)throw new Error(`State '${e}' does not exist on '${n.id}'`);return[n,i]}let t=Object.keys(e),r=t.map(i=>it(n,i)).filter(Boolean);return[n.machine.root,n].concat(r,t.reduce((i,o)=>{let s=it(n,o);if(!s)return i;let l=ot(s,e[o]);return i.concat(l)},[]))}function bs(n,e,t,r){let o=it(n,e).next(t,r);return!o||!o.length?n.next(t,r):o}function _s(n,e,t,r){let i=Object.keys(e),o=it(n,i[0]),s=en(o,e[i[0]],t,r);return!s||!s.length?n.next(t,r):s}function Es(n,e,t,r){let i=[];for(let o of Object.keys(e)){let s=e[o];if(!s)continue;let l=it(n,o),d=en(l,s,t,r);d&&i.push(...d)}return i.length?i:n.next(t,r)}function en(n,e,t,r){return typeof e=="string"?bs(n,e,t,r):Object.keys(e).length===1?_s(n,e,t,r):Es(n,e,t,r)}function xs(n){return Object.keys(n.states).map(e=>n.states[e]).filter(e=>e.type==="history")}function $e(n,e){let t=n;for(;t.parent&&t.parent!==e;)t=t.parent;return t.parent===e}function Ss(n,e){let t=new Set(n),r=new Set(e);for(let i of t)if(r.has(i))return!0;for(let i of r)if(t.has(i))return!0;return!1}function si(n,e,t){let r=new Set;for(let i of n){let o=!1,s=new Set;for(let l of r)if(Ss(Ln([i],e,t),Ln([l],e,t)))if($e(i.source,l.source))s.add(l);else{o=!0;break}if(!o){for(let l of s)r.delete(l);r.add(i)}}return Array.from(r)}function As(n){let[e,...t]=n;for(let r of St(e,void 0))if(t.every(i=>$e(i,r)))return r}function Hn(n,e){if(!n.target)return[];let t=new Set;for(let r of n.target)if(Qe(r))if(e[r.id])for(let i of e[r.id])t.add(i);else for(let i of Hn(ii(r),e))t.add(i);else t.add(r);return[...t]}function ai(n,e){let t=Hn(n,e);if(!t)return;if(!n.reenter&&t.every(i=>i===n.source||$e(i,n.source)))return n.source;let r=As(t.concat(n.source));if(r)return r;if(!n.reenter)return n.source.machine.root}function Ln(n,e,t){let r=new Set;for(let i of n)if(i.target?.length){let o=ai(i,t);i.reenter&&i.source===o&&r.add(o);for(let s of e)$e(s,o)&&r.add(s)}return[...r]}function Is(n,e){if(n.length!==e.size)return!1;for(let t of n)if(!e.has(t))return!1;return!0}function ci(n,e,t,r,i){return Nn([{target:[...oi(n)],source:n,reenter:!0,actions:[],eventType:null,toJSON:null}],e,t,r,!0,i)}function Nn(n,e,t,r,i,o){let s=[];if(!n.length)return[e,s];let l=t.actionExecutor;t.actionExecutor=d=>{s.push(d),l(d)};try{let d=new Set(e._nodes),g=e.historyValue,S=si(n,d,g),w=e;i||([w,g]=ks(w,r,t,S,d,g,o,t.actionExecutor)),w=Je(w,r,t,S.flatMap(_=>_.actions),o,void 0),w=Ts(w,r,t,S,d,o,g,i);let m=[...d];w.status==="done"&&(w=Je(w,r,t,m.sort((_,I)=>I.order-_.order).flatMap(_=>_.exit),o,void 0));try{return g===e.historyValue&&Is(e._nodes,d)?[w,s]:[Ue(w,{_nodes:m,historyValue:g}),s]}catch(_){throw _}}finally{t.actionExecutor=l}}function Cs(n,e,t,r,i){if(r.output===void 0)return;let o=Pn(i.id,i.output!==void 0&&i.parent?On(i.output,n.context,e,t.self):void 0);return On(r.output,n.context,o,t.self)}function Ts(n,e,t,r,i,o,s,l){let d=n,g=new Set,S=new Set;Rs(r,s,S,g),l&&S.add(n.machine.root);let w=new Set;for(let m of[...g].sort((_,I)=>_.order-I.order)){i.add(m);let _=[];_.push(...m.entry);for(let I of m.invoke)_.push(Wr(I.src,{...I,syncSnapshot:!!I.onSnapshot}));if(S.has(m)){let I=m.initial.actions;_.push(...I)}if(d=Je(d,e,t,_,o,m.invoke.map(I=>I.id)),m.type==="final"){let I=m.parent,L=I?.type==="parallel"?I:I?.parent,U=L||m;for(I?.type==="compound"&&o.push(Pn(I.id,m.output!==void 0?On(m.output,d.context,e,t.self):void 0));L?.type==="parallel"&&!w.has(L)&&Zt(i,L);)w.add(L),o.push(Pn(L.id)),U=L,L=L.parent;if(L)continue;d=Ue(d,{status:"done",output:Cs(d,e,t,d.machine.root,U)})}}return d}function Rs(n,e,t,r){for(let i of n){let o=ai(i,e);for(let l of i.target||[])!Qe(l)&&(i.source!==l||i.source!==o||i.reenter)&&(r.add(l),t.add(l)),nt(l,e,t,r);let s=Hn(i,e);for(let l of s){let d=St(l,o);o?.type==="parallel"&&d.push(o),li(r,e,t,d,!i.source.parent&&i.reenter?void 0:o)}}}function nt(n,e,t,r){if(Qe(n))if(e[n.id]){let i=e[n.id];for(let o of i)r.add(o),nt(o,e,t,r);for(let o of i)Mn(o,n.parent,r,e,t)}else{let i=ii(n);for(let o of i.target)r.add(o),i===n.parent?.initial&&t.add(n.parent),nt(o,e,t,r);for(let o of i.target)Mn(o,n.parent,r,e,t)}else if(n.type==="compound"){let[i]=n.initial.target;Qe(i)||(r.add(i),t.add(i)),nt(i,e,t,r),Mn(i,n,r,e,t)}else if(n.type==="parallel")for(let i of rt(n).filter(o=>!Qe(o)))[...r].some(o=>$e(o,i))||(Qe(i)||(r.add(i),t.add(i)),nt(i,e,t,r))}function li(n,e,t,r,i){for(let o of r)if((!i||$e(o,i))&&n.add(o),o.type==="parallel")for(let s of rt(o).filter(l=>!Qe(l)))[...n].some(l=>$e(l,s))||(n.add(s),nt(s,e,t,n))}function Mn(n,e,t,r,i){li(t,r,i,St(n,e))}function ks(n,e,t,r,i,o,s,l){let d=n,g=Ln(r,i,o);g.sort((w,m)=>m.order-w.order);let S;for(let w of g)for(let m of xs(w)){let _;m.history==="deep"?_=I=>Vn(I)&&$e(I,w):_=I=>I.parent===w,S??={...o},S[m.id]=Array.from(i).filter(_)}for(let w of g)d=Je(d,e,t,[...w.exit,...w.invoke.map(m=>zn(m.id))],s,void 0),i.delete(w);return[d,S||o]}function Ms(n,e){return n.implementations.actions[e]}function di(n,e,t,r,i,o){let{machine:s}=n,l=n;for(let d of r){let g=typeof d=="function",S=g?d:Ms(s,typeof d=="string"?d:d.type),w={context:l.context,event:e,self:t.self,system:t.system},m=g||typeof d=="string"?void 0:"params"in d?typeof d.params=="function"?d.params({context:l.context,event:e}):d.params:void 0;if(!S||!("resolve"in S)){t.actionExecutor({type:typeof d=="string"?d:typeof d=="object"?d.type:d.name||"(anonymous)",info:w,params:m,exec:S});continue}let _=S,[I,L,U]=_.resolve(t,l,w,m,S,i);l=I,"retryResolve"in _&&o?.push([_,L]),"execute"in _&&t.actionExecutor({type:_.type,info:w,params:L,exec:_.execute.bind(null,t,L)}),U&&(l=di(l,e,t,U,i,o))}return l}function Je(n,e,t,r,i,o){let s=o?[]:void 0,l=di(n,e,t,r,{internalQueue:i,deferredActorIds:o},s);return s?.forEach(([d,g])=>{d.retryResolve(t,l,g)}),l}function tn(n,e,t,r){let i=n,o=[];function s(g,S,w){t.system._sendInspectionEvent({type:"@xstate.microstep",actorRef:t.self,event:S,snapshot:g[0],_transitions:w}),o.push(g)}if(e.type===_t)return i=Ue(Fr(i,e,t),{status:"stopped"}),s([i,[]],e,[]),{snapshot:i,microsteps:o};let l=e;if(l.type!==zr){let g=l,S=cs(g),w=qr(g,i);if(S&&!w.length)return i=Ue(n,{status:"error",error:g.error}),s([i,[]],g,[]),{snapshot:i,microsteps:o};let m=Nn(w,n,t,l,!1,r);i=m[0],s(m,g,w)}let d=!0;for(;i.status==="active";){let g=d?Ps(i,l):[],S=g.length?i:void 0;if(!g.length){if(!r.length)break;l=r.shift(),g=qr(l,i)}let w=Nn(g,i,t,l,!1,r);i=w[0],d=i!==S,s(w,l,g)}return i.status!=="active"&&Fr(i,l,t),{snapshot:i,microsteps:o}}function Fr(n,e,t){return Je(n,e,t,Object.values(n.children).map(r=>zn(r)),[],void 0)}function qr(n,e){return e.machine.getTransitionData(e,n)}function Ps(n,e){let t=new Set,r=n._nodes.filter(Vn);for(let i of r)e:for(let o of[i].concat(St(i,void 0)))if(o.always){for(let s of o.always)if(s.guard===void 0||Xt(s.guard,n.context,e,n)){t.add(s);break e}}return si(Array.from(t),new Set(n._nodes),n.historyValue)}function ui(n,e){let t=At(ot(n,e));return Xr(n,[...t])}function hi(n){return!!n&&typeof n=="object"&&"machine"in n&&"value"in n}var Os=function(e){return Un(e,this.value)},Ls=function(e){return this.tags.has(e)},Ns=function(e){let t=this.machine.getTransitionData(this,e);return!!t?.length&&t.some(r=>r.target!==void 0||r.actions.length)},Ds=function(){let{_nodes:e,tags:t,machine:r,getMeta:i,toJSON:o,can:s,hasTag:l,matches:d,...g}=this;return{...g,tags:Array.from(t)}},Bs=function(){return this._nodes.reduce((e,t)=>(t.meta!==void 0&&(e[t.id]=t.meta),e),{})};function Ct(n,e){return{status:n.status,output:n.output,error:n.error,machine:e,context:n.context,_nodes:n._nodes,value:Xr(e.root,n._nodes),tags:new Set(n._nodes.flatMap(t=>t.tags)),children:n.children,historyValue:n.historyValue||{},matches:Os,hasTag:Ls,can:Ns,getMeta:Bs,toJSON:Ds}}function Ue(n,e={}){return Ct({...n,...e},n.machine)}function $s(n){if(typeof n!="object"||n===null)return{};let e={};for(let t in n){let r=n[t];Array.isArray(r)&&(e[t]=r.map(i=>({id:i.id})))}return e}function fi(n,e){let{_nodes:t,tags:r,machine:i,children:o,context:s,can:l,hasTag:d,matches:g,getMeta:S,toJSON:w,...m}=n,_={};for(let L in o){let U=o[L];_[L]={snapshot:U.getPersistedSnapshot(e),src:U.src,systemId:U.systemId,syncSnapshot:U._syncSnapshot}}return{...m,context:gi(s),children:_,historyValue:$s(m.historyValue)}}function gi(n){let e;for(let t in n){let r=n[t];if(r&&typeof r=="object")if("sessionId"in r&&"send"in r&&"ref"in r)e??=Array.isArray(n)?n.slice():{...n},e[t]={xstate$$type:Yt,id:r.id};else{let i=gi(r);i!==r&&(e??=Array.isArray(n)?n.slice():{...n},e[t]=i)}}return e??n}function Us(n,e,t,r,{event:i,id:o,delay:s},{internalQueue:l}){let d=e.machine.implementations.delays;if(typeof i=="string")throw new Error(`Only event objects may be used with raise; use raise({ type: "${i}" }) instead`);let g=typeof i=="function"?i(t,r):i,S;if(typeof s=="string"){let w=d&&d[s];S=typeof w=="function"?w(t,r):w}else S=typeof s=="function"?s(t,r):s;return typeof S!="number"&&l.push(g),[e,{event:g,id:o,delay:S},void 0]}function Fs(n,e){let{event:t,delay:r,id:i}=e;if(typeof r=="number"){n.defer(()=>{let o=n.self;n.system.scheduler.schedule(o,o,t,r,i)});return}}function pi(n,e){function t(r,i){}return t.type="xstate.raise",t.event=n,t.id=e?.id,t.delay=e?.delay,t.resolve=Us,t.execute=Fs,t}function wi(n,e){return{config:n,transition:(t,r,i)=>({...t,context:n(t.context,r,i)}),getInitialSnapshot:(t,r)=>({status:"active",output:void 0,error:void 0,context:typeof e=="function"?e({input:r}):e}),getPersistedSnapshot:t=>t,restoreSnapshot:t=>t}}var mi="xstate.promise.resolve",yi="xstate.promise.reject",Tt=new WeakMap;function nn(n){return{config:n,transition:(t,r,i)=>{if(t.status!=="active")return t;switch(r.type){case mi:{let o=r.data;return{...t,status:"done",output:o,input:void 0}}case yi:return{...t,status:"error",error:r.data,input:void 0};case _t:return Tt.get(i.self)?.abort(),Tt.delete(i.self),{...t,status:"stopped",input:void 0};default:return t}},start:(t,{self:r,system:i,emit:o})=>{if(t.status!=="active")return;let s=new AbortController;Tt.set(r,s),Promise.resolve(n({input:t.input,system:i,self:r,signal:s.signal,emit:o})).then(d=>{r.getSnapshot().status==="active"&&(Tt.delete(r),i._relay(r,r,{type:mi,data:d}))},d=>{r.getSnapshot().status==="active"&&(Tt.delete(r),i._relay(r,r,{type:yi,data:d}))})},getInitialSnapshot:(t,r)=>({status:"active",output:void 0,error:void 0,input:r}),getPersistedSnapshot:t=>t,restoreSnapshot:t=>t}}var vc=wi(n=>{},void 0);function qs(n,{machine:e,context:t},r,i){let o=(s,l)=>{if(typeof s=="string"){let d=xt(e,s);if(!d)throw new Error(`Actor logic '${s}' not implemented in machine '${e.id}'`);let g=ke(d,{id:l?.id,parent:n.self,syncSnapshot:l?.syncSnapshot,input:typeof l?.input=="function"?l.input({context:t,event:r,self:n.self}):l?.input,src:s,systemId:l?.systemId});return i[g.id]=g,g}else return ke(s,{id:l?.id,parent:n.self,syncSnapshot:l?.syncSnapshot,input:l?.input,src:s,systemId:l?.systemId})};return(s,l)=>{let d=o(s,l);return i[d.id]=d,n.defer(()=>{d._processingStatus!==ye.Stopped&&d.start()}),d}}function zs(n,e,t,r,{assignment:i}){if(!e.context)throw new Error("Cannot assign to undefined `context`. Ensure that `context` is defined in the machine config.");let o={},s={context:e.context,event:t.event,spawn:qs(n,e,t.event,o),self:n.self,system:n.system},l={};if(typeof i=="function")l=i(s,r);else for(let g of Object.keys(i)){let S=i[g];l[g]=typeof S=="function"?S(s,r):S}let d=Object.assign({},e.context,l);return[Ue(e,{context:d,children:Object.keys(o).length?{...e.children,...o}:e.children}),void 0,void 0]}function oe(n){function e(t,r){}return e.type="xstate.assign",e.assignment=n,e.resolve=zs,e}var vi=new WeakMap;function st(n,e,t){let r=vi.get(n);return r?e in r||(r[e]=t()):(r={[e]:t()},vi.set(n,r)),r[e]}var Vs={},Rt=n=>typeof n=="string"?{type:n}:typeof n=="function"?"resolve"in n?{type:n.type}:{type:n.name}:n,rn=class n{constructor(e,t){if(this.config=e,this.key=void 0,this.id=void 0,this.type=void 0,this.path=void 0,this.states=void 0,this.history=void 0,this.entry=void 0,this.exit=void 0,this.parent=void 0,this.machine=void 0,this.meta=void 0,this.output=void 0,this.order=-1,this.description=void 0,this.tags=[],this.transitions=void 0,this.always=void 0,this.parent=t._parent,this.key=t._key,this.machine=t._machine,this.path=this.parent?this.parent.path.concat(this.key):[],this.id=this.config.id||[this.machine.id,...this.path].join(Dn),this.type=this.config.type||(this.config.states&&Object.keys(this.config.states).length?"compound":this.config.history?"history":"atomic"),this.description=this.config.description,this.order=this.machine.idMap.size,this.machine.idMap.set(this.id,this),this.states=this.config.states?Fn(this.config.states,(r,i)=>new n(r,{_parent:this,_key:i,_machine:this.machine})):Vs,this.type==="compound"&&!this.config.initial)throw new Error(`No initial state specified for compound state node "#${this.id}". Try adding { initial: "${Object.keys(this.states)[0]}" } to the state config.`);this.history=this.config.history===!0?"shallow":this.config.history||!1,this.entry=De(this.config.entry).slice(),this.exit=De(this.config.exit).slice(),this.meta=this.config.meta,this.output=this.type==="final"||!this.parent?this.config.output:void 0,this.tags=De(e.tags).slice()}_initialize(){this.transitions=ti(this),this.config.always&&(this.always=We(this.config.always).map(e=>Ne(this,Bn,e))),Object.keys(this.states).forEach(e=>{this.states[e]._initialize()})}get definition(){return{id:this.id,key:this.key,version:this.machine.version,type:this.type,initial:this.initial?{target:this.initial.target,source:this,actions:this.initial.actions.map(Rt),eventType:null,reenter:!1,toJSON:()=>({target:this.initial.target.map(e=>`#${e.id}`),source:`#${this.id}`,actions:this.initial.actions.map(Rt),eventType:null})}:void 0,history:this.history,states:Fn(this.states,e=>e.definition),on:this.on,transitions:[...this.transitions.values()].flat().map(e=>({...e,actions:e.actions.map(Rt)})),entry:this.entry.map(Rt),exit:this.exit.map(Rt),meta:this.meta,order:this.order||-1,output:this.output,invoke:this.invoke,description:this.description,tags:this.tags}}toJSON(){return this.definition}get invoke(){return st(this,"invoke",()=>De(this.config.invoke).map((e,t)=>{let{src:r,systemId:i}=e,o=e.id??qn(this.id,t),s=typeof r=="string"?r:`xstate.invoke.${qn(this.id,t)}`;return{...e,src:s,id:o,systemId:i,toJSON(){let{onDone:l,onError:d,...g}=e;return{...g,type:"xstate.invoke",src:s,id:o}}}}))}get on(){return st(this,"on",()=>[...this.transitions].flatMap(([t,r])=>r.map(i=>[t,i])).reduce((t,[r,i])=>(t[r]=t[r]||[],t[r].push(i),t),{}))}get after(){return st(this,"delayedTransitions",()=>ei(this))}get initial(){return st(this,"initial",()=>ri(this,this.config.initial))}next(e,t){let r=t.type,i=[],o,s=st(this,`candidates-${r}`,()=>Zr(this,r));for(let l of s){let{guard:d}=l,g=e.context,S=!1;try{S=!d||Xt(d,g,t,e)}catch(w){let m=typeof d=="string"?d:typeof d=="object"?d.type:void 0;throw new Error(`Unable to evaluate guard ${m?`'${m}' `:""}in transition for event '${r}' in state node '${this.id}':
${w.message}`)}if(S){i.push(...l.actions),o=l;break}}return o?[o]:void 0}get events(){return st(this,"events",()=>{let{states:e}=this,t=new Set(this.ownEvents);if(e)for(let r of Object.keys(e)){let i=e[r];if(i.states)for(let o of i.events)t.add(`${o}`)}return Array.from(t)})}get ownEvents(){let e=Object.keys(Object.fromEntries(this.transitions)),t=new Set(e.filter(r=>this.transitions.get(r).some(i=>!(!i.target&&!i.actions.length&&!i.reenter))));return Array.from(t)}},Hs="#",on=class n{constructor(e,t){this.config=e,this.version=void 0,this.schemas=void 0,this.implementations=void 0,this.__xstatenode=!0,this.idMap=new Map,this.root=void 0,this.id=void 0,this.states=void 0,this.events=void 0,this.id=e.id||"(machine)",this.implementations={actors:t?.actors??{},actions:t?.actions??{},delays:t?.delays??{},guards:t?.guards??{}},this.version=this.config.version,this.schemas=this.config.schemas,this.transition=this.transition.bind(this),this.getInitialSnapshot=this.getInitialSnapshot.bind(this),this.getPersistedSnapshot=this.getPersistedSnapshot.bind(this),this.restoreSnapshot=this.restoreSnapshot.bind(this),this.start=this.start.bind(this),this.root=new rn(e,{_key:this.id,_machine:this}),this.root._initialize(),ni(this.root),this.states=this.root.states,this.events=this.root.events}provide(e){let{actions:t,guards:r,actors:i,delays:o}=this.implementations;return new n(this.config,{actions:{...t,...e.actions},guards:{...r,...e.guards},actors:{...i,...e.actors},delays:{...o,...e.delays}})}resolveState(e){let t=ui(this.root,e.value),r=At(ot(this.root,t));return Ct({_nodes:[...r],context:e.context||{},children:{},status:Zt(r,this.root)?"done":e.status||"active",output:e.output,error:e.error,historyValue:e.historyValue},this)}transition(e,t,r){return tn(e,t,r,[]).snapshot}microstep(e,t,r){return tn(e,t,r,[]).microsteps.map(([i])=>i)}getTransitionData(e,t){return en(this.root,e.value,e,t)||[]}_getPreInitialState(e,t,r){let{context:i}=this.config,o=Ct({context:typeof i!="function"&&i?i:{},_nodes:[this.root],children:{},status:"active"},this);return typeof i=="function"?Je(o,t,e,[oe(({spawn:l,event:d,self:g})=>i({spawn:l,input:d.input,self:g}))],r,void 0):o}getInitialSnapshot(e,t){let r=$n(t),i=[],o=this._getPreInitialState(e,r,i),[s]=ci(this.root,o,e,r,i),{snapshot:l}=tn(s,r,e,i);return l}start(e){Object.values(e.children).forEach(t=>{t.getSnapshot().status==="active"&&t.start()})}getStateNodeById(e){let t=Jt(e),r=t.slice(1),i=It(t[0])?t[0].slice(Hs.length):t[0],o=this.idMap.get(i);if(!o)throw new Error(`Child state node '#${i}' does not exist on machine '${this.id}'`);return Et(o,r)}get definition(){return this.root.definition}toJSON(){return this.definition}getPersistedSnapshot(e,t){return fi(e,t)}restoreSnapshot(e,t){let r={},i=e.children;Object.keys(i).forEach(w=>{let m=i[w],_=m.snapshot,I=m.src,L=typeof I=="string"?xt(this,I):I;if(!L)return;let U=ke(L,{id:w,parent:t.self,syncSnapshot:m.syncSnapshot,snapshot:_,src:I,systemId:m.systemId});r[w]=U});function o(w,m){if(m instanceof rn)return m;try{return w.machine.getStateNodeById(m.id)}catch{}}function s(w,m){if(!m||typeof m!="object")return{};let _={};for(let I in m){let L=m[I];for(let U of L){let G=o(w,U);G&&(_[I]??=[],_[I].push(G))}}return _}let l=s(this.root,e.historyValue),d=Ct({...e,children:r,_nodes:Array.from(At(ot(this.root,e.value))),historyValue:l},this),g=new Set;function S(w,m){if(!g.has(w)){g.add(w);for(let _ in w){let I=w[_];if(I&&typeof I=="object"){if("xstate$$type"in I&&I.xstate$$type===Yt){w[_]=m[I.id];continue}S(I,m)}}}}return S(d.context,r),d}};function bi(n,e){return new on(n,e)}var Gs=n=>n.replace(/(^|[^:])\/{2,}/g,"$1/"),_i=n=>n!=="/"?n.replace(/\/+$/u,""):n,kt=n=>{try{let t=new URL(n).hostname;return t==="localhost"||t==="127.0.0.1"||t==="[::1]"||t==="::1"}catch{return!1}},sn=(n,e)=>{if(n.startsWith("http://")&&!kt(n))throw new Error(`${e} must use HTTPS. Plain HTTP is only permitted for localhost during development.`)},an=(n,e,t)=>{if(/^[a-z][a-z0-9+.+-]*:\/\//i.test(n))try{let o=new URL(n).hostname.toLowerCase(),s=t.map(l=>l.toLowerCase());if(!s.includes(o))throw new Error(`${e} domain "${o}" is not in the allowed domains list. Allowed: ${s.join(", ")}`)}catch(i){if(i instanceof Error&&i.message.includes("not in the allowed domains list"))throw i}},js={production:{apiBase:"https://hosted.provii.app/v1/hosted",challenge:"https://hosted.provii.app/v1/hosted/challenge",status:"https://hosted.provii.app/v1/hosted/status/{sid}"},sandbox:{apiBase:"https://sandbox-hosted.provii.app/v1/hosted",challenge:"https://sandbox-hosted.provii.app/v1/hosted/challenge",status:"https://sandbox-hosted.provii.app/v1/hosted/status/{sid}"}},Me=2048,Ei=500,xi=6e4,Si=0,Ai=9999999999,Ii=2031517468,Mt=class{environment;publicKey;challengeUrl;statusUrl;pollUrl;contentUrl;mountElementId;pollInterval;verifyingKeyId;redeemUrl;redeemMode;cspNonce;allowedDomains;theme;constructor(e){if(!e)throw new Error("AgeGateOptions is required");let{environment:t,publicKey:r,challengeUrl:i,statusUrl:o,pollUrl:s,contentUrl:l,mountElementId:d,pollInterval:g,verifyingKeyId:S,redeemUrl:w,redeemMode:m,cspNonce:_,allowedDomains:I,theme:L}=e;if(I!==void 0){if(!Array.isArray(I)||I.length===0)throw new Error("allowedDomains must be a non-empty array of domain strings");for(let Ae of I)if(typeof Ae!="string"||Ae.trim().length===0)throw new Error("Each entry in allowedDomains must be a non-empty string");this.allowedDomains=Object.freeze([...I])}if(L&&L!=="light"&&L!=="dark"&&L!=="auto")throw new Error("theme must be 'light', 'dark', or 'auto'");if(this.theme=L||"auto",t&&t!=="production"&&t!=="sandbox")throw new Error("environment must be 'production' or 'sandbox'");if(this.environment=t||"production",!r||r.trim()==="")throw new Error("publicKey is required");if(!/^pk_(live|test)_[a-f0-9]{64}$/.test(r))throw new Error("publicKey must be in format pk_live_xxx or pk_test_xxx (64 hex chars)");if(this.publicKey=r,!l)throw new Error("contentUrl is required");if(!d)throw new Error("mountElementId is required");if(typeof document<"u"&&(document.getElementById(d)||console.warn(`[AgeGateConfig] Element with ID '${d}' not found in DOM`)),S!==void 0){if(!Number.isInteger(S)||S<Si||S>Ai)throw new Error(`verifyingKeyId must be an integer between ${Si} and ${Ai}`);this.verifyingKeyId=S}else this.verifyingKeyId=Ii;if(this.redeemMode=m||"direct",this.redeemMode==="rp-proxy"&&!w)throw new Error("redeemUrl is required when using rp-proxy mode");if(w){if(w.length>Me)throw new Error(`redeemUrl exceeds maximum length of ${Me} characters`);this.redeemUrl=w}if(_!==void 0){if(typeof _!="string"||_.length===0)throw new Error("cspNonce must be a non-empty string");if(!/^[A-Za-z0-9+/=]+$/.test(_))throw new Error("cspNonce must be a base64 string");this.cspNonce=_}if(s){if(s.length>Me)throw new Error(`pollUrl exceeds maximum length of ${Me} characters`);this.pollUrl=s}typeof process<"u";let G="http://localhost";try{G=new URL(window.location.href).origin,G==="null"&&(G="http://localhost")}catch{}let ne=/^[a-z][a-z0-9+.+-]*:\/\//i,_e=js[this.environment],ve=i?.trim()||_e.challenge;if(ve.length>Me)throw new Error(`challengeUrl exceeds maximum length of ${Me} characters`);this.challengeUrl=ne.test(ve)?new URL(ve).href:new URL(ve,G).href;let he=`${_i(this.challengeUrl.replace(/[?#].*$/,""))}/{sid}`,de;if(o&&o.trim()){let Ae=o.trim().replace(/^\/{2,}/,"/");if(Ae.length>Me)throw new Error(`statusUrl exceeds maximum length of ${Me} characters`);let Le=ne.test(Ae)?Ae:G+Ae,C=Le.replace(/^.*?:\/\/[^/]+/,""),A=(C.match(/\{sid\}/g)||[]).length+(C.match(/%7Bsid%7D/gi)||[]).length;if(A===0)throw new Error("statusUrl must contain exactly one {sid} placeholder");if(A>1)throw new Error("statusUrl must contain at most one {sid} placeholder in the path");de=Gs(Le).replace(/%7Bsid%7D/gi,"{sid}")}else de=o==null||o===""?_e.status:he;this.statusUrl=de;let Ee=l.replace(/^\/{2,}/,"/");if(Ee.length>Me)throw new Error(`contentUrl exceeds maximum length of ${Me} characters`);let xe=ne.test(Ee)?new URL(Ee):new URL(Ee,G);if(xe.origin!==G)throw new Error(`contentUrl must be same-origin as the hosting page. Expected origin: ${G}, got: ${xe.origin}`);if(xe.pathname=_i(xe.pathname),xe.hash="",this.contentUrl=xe.origin+xe.pathname+xe.search,this.mountElementId=d,g!==void 0){if(!Number.isInteger(g))throw new Error("pollInterval must be an integer");if(g<Ei)throw new Error(`pollInterval must be \u2265 ${Ei} ms`);if(g>xi)throw new Error(`pollInterval must be \u2264 ${xi} ms`)}this.pollInterval=g??3e3,sn(this.challengeUrl,"challengeUrl"),sn(this.statusUrl,"statusUrl"),this.redeemUrl&&sn(this.redeemUrl,"redeemUrl"),this.pollUrl&&sn(this.pollUrl,"pollUrl"),this.allowedDomains&&(an(this.challengeUrl,"challengeUrl",this.allowedDomains),an(this.statusUrl,"statusUrl",this.allowedDomains),this.redeemUrl&&an(this.redeemUrl,"redeemUrl",this.allowedDomains),this.pollUrl&&an(this.pollUrl,"pollUrl",this.allowedDomains))}validateForProduction(){let e=[];if(this.challengeUrl.startsWith("http://")&&!kt(this.challengeUrl))throw new Error("challengeUrl uses insecure HTTP. HTTPS is required for production.");if(this.statusUrl.startsWith("http://")&&!kt(this.statusUrl))throw new Error("statusUrl uses insecure HTTP. HTTPS is required for production.");if(this.redeemUrl&&this.redeemUrl.startsWith("http://")&&!kt(this.redeemUrl))throw new Error("redeemUrl uses insecure HTTP. HTTPS is required for production.");if(this.pollUrl&&this.pollUrl.startsWith("http://")&&!kt(this.pollUrl))throw new Error("pollUrl uses insecure HTTP. HTTPS is required for production.");return this.pollInterval<1e3&&e.push(`Poll interval of ${this.pollInterval}ms may be too aggressive`),this.verifyingKeyId===Ii&&e.push("Using default verifying key ID, consider configuring for your deployment"),e}};var pr=Nr(Co(),1),He=class extends Error{userMessage;code;details;constructor(e,t,r,i){super(e),this.userMessage=t,this.code=r,this.details=i,this.name="QRError"}},gr=2048,Fa=256,Ft={INVALID_INPUT:"Invalid QR code data. Please try again.",CANVAS_ERROR:"Unable to generate QR code display. Please try again.",SIZE_EXCEEDED:"Data too large for QR code. Please try with less data."},qt=async(n,e,t)=>{try{if(!n||!(n instanceof HTMLCanvasElement))throw new He("Invalid canvas element",Ft.CANVAS_ERROR,"INVALID_CANVAS");if(!e||typeof e!="string")throw new He("Invalid text input for QR code",Ft.INVALID_INPUT,"INVALID_TEXT_INPUT");if(e.length>gr)throw console.error(`[qr] Text too large: ${e.length} bytes (max: ${gr})`),new He(`Text too large for QR code: ${e.length} chars`,Ft.SIZE_EXCEEDED,"TEXT_TOO_LARGE",{size:e.length,maxSize:gr});console.debug(`[qr] Encoding ${e.length} chars into QR code`);let r={errorCorrectionLevel:t?.errorCorrectionLevel||"M",margin:t?.margin??1,width:t?.width||Fa,color:{dark:"#000000",light:"#FFFFFF"}};try{await pr.default.toCanvas(n,e,r),console.debug("[qr] Successfully rendered QR code")}catch(i){console.error("[qr] QRCode library error:",i);let o=i instanceof Error?i.message:String(i);if(o.includes("too long")&&r.errorCorrectionLevel!=="L"){console.debug("[qr] Retrying with Low error correction"),r.errorCorrectionLevel="L";try{await pr.default.toCanvas(n,e,r),console.debug("[qr] Successfully rendered QR code with Low error correction");return}catch(s){console.error("[qr] Retry also failed:",s)}}throw new He(`QR code generation failed: ${o}`,Ft.CANVAS_ERROR,"QR_GENERATION_FAILED",i)}}catch(r){throw r instanceof He?r:(console.error("[qr] Unexpected error:",r),new He(`Unexpected error: ${r}`,Ft.CANVAS_ERROR,"RENDER_UNEXPECTED",r))}};var mr=()=>typeof navigator<"u"&&/iphone|ipad|android|ios/i.test(navigator.userAgent);var ge=class extends Error{userMessage;code;statusCode;details;constructor(e,t,r,i,o){super(e),this.userMessage=t,this.code=r,this.statusCode=i,this.details=o,this.name="NetworkError"}},To=3e4,yr=6e4,wr=1e3,Ge={TIMEOUT:"Request timed out. Please check your connection and try again.",NETWORK_ERROR:"Unable to connect. Please check your internet connection.",ABORT:"Request was cancelled.",SERVER_ERROR:"Server error. Please try again later.",CLIENT_ERROR:"Invalid request. Please refresh and try again.",RESPONSE_TOO_LARGE:"Response too large. Please contact support."};async function Pe(n,e={},t){let r=qa(t);if(!r)return Ro(n,e);let i=new AbortController,o=setTimeout(()=>i.abort(),r);try{let s=za(e.signal,i.signal),l=await Ro(n,{...e,signal:s});return clearTimeout(o),l}catch(s){throw clearTimeout(o),i.signal.aborted&&s instanceof Error?new ge(`Request timed out after ${r}ms`,Ge.TIMEOUT,"FETCH_TIMEOUT",void 0,{timeout:r,url:ht(n)}):(s instanceof ge,s)}}function qa(n){return n==null?To:typeof n!="number"||!isFinite(n)?(console.warn("[fetchWithTimeout] Invalid timeout value, using default:",n),To):n<=0?null:n<wr?(console.warn(`[fetchWithTimeout] Timeout too short (${n}ms), using minimum ${wr}ms`),wr):n>yr?(console.warn(`[fetchWithTimeout] Timeout too long (${n}ms), using maximum ${yr}ms`),yr):n}async function Ro(n,e={}){try{let t=await fetch(n,e);return t.ok||console.warn(`[fetchWithTimeout] HTTP ${t.status} ${t.statusText} for ${ht(n)}`),t}catch(t){if(t instanceof TypeError)throw console.error("[fetchWithTimeout] Network error:",t.message),new ge("Network request failed",Ge.NETWORK_ERROR,"NETWORK_FAILURE",void 0,{url:ht(n)});if(t instanceof Error){if(t.name==="AbortError")throw new ge("Request was aborted",Ge.ABORT,"FETCH_ABORTED",void 0,{url:ht(n)});if(t.message?.toLowerCase().includes("timeout"))throw new ge("Browser request timeout",Ge.TIMEOUT,"BROWSER_TIMEOUT",void 0,{url:ht(n)})}throw console.error("[fetchWithTimeout] Unexpected error:",t),new ge("Unexpected fetch error",Ge.NETWORK_ERROR,"FETCH_UNEXPECTED",void 0,{url:ht(n)})}}function za(n,e){if(!n)return e;if(!e)return n;let t=new AbortController,r=()=>t.abort();return n.addEventListener("abort",r),e.addEventListener("abort",r),(n.aborted||e.aborted)&&t.abort(),t.signal}function ht(n){try{return typeof n=="string"?n:n instanceof URL?n.toString():n instanceof Request?n.url:"<unknown>"}catch{return"<unknown>"}}function Va(n,e,t=!1){let r=n.headers.get("content-type");if(!r){if(t&&n.status===204)return;console.warn("[fetchWithTimeout] Missing content-type header");return}let i=r.toLowerCase().split(";")[0]?.trim()??"",o=e.toLowerCase();i.startsWith(o)||console.warn(`[fetchWithTimeout] Unexpected content-type: ${r}, expected: ${e}`)}async function Ha(n,e=10*1024*1024,t="response"){try{let r=n.headers.get("content-length");if(r){let g=parseInt(r,10);if(!isNaN(g)&&g>e)throw new ge(`${t} too large: ${g} bytes exceeds ${e}`,Ge.RESPONSE_TOO_LARGE,"RESPONSE_TOO_LARGE",n.status,{size:g,maxSize:e})}let i=n.body?.getReader();if(!i){let g=await n.arrayBuffer();if(g.byteLength>e)throw new ge(`${t} too large: ${g.byteLength} bytes exceeds ${e}`,Ge.RESPONSE_TOO_LARGE,"RESPONSE_TOO_LARGE",n.status,{size:g.byteLength,maxSize:e});return g}let o=[],s=0;try{for(;;){let{done:g,value:S}=await i.read();if(g)break;if(s+=S.length,s>e)throw new ge(`${t} too large: ${s} bytes exceeds ${e}`,Ge.RESPONSE_TOO_LARGE,"RESPONSE_TOO_LARGE",n.status,{size:s,maxSize:e});o.push(S)}}finally{try{i.releaseLock()}catch{}}let l=new Uint8Array(s),d=0;for(let g of o)l.set(g,d),d+=g.length;return l.buffer}catch(r){throw r instanceof ge?r:(console.error(`[fetchWithTimeout] Failed to read ${t}:`,r),new ge(`Failed to read ${t}: ${r}`,"Failed to read server response. Please try again.","BODY_READ_FAILED",n.status,r))}}async function zt(n,e=1024*1024,t="JSON response"){try{Va(n,"application/json",!0);let r=await Ha(n,e,t),i=new TextDecoder("utf-8").decode(r);try{return JSON.parse(i)}catch(o){console.error("[fetchWithTimeout] JSON parse failed:",o);let s=i.length>100?i.substring(0,100)+"...":i;throw new ge(`Invalid JSON in ${t}: ${o}`,"Invalid response format. Please try again.","JSON_PARSE_FAILED",n.status,{parseError:o,preview:s})}}catch(r){throw r instanceof ge?r:new ge(`Failed to read ${t}: ${r}`,"Failed to process server response. Please try again.","JSON_READ_FAILED",n.status,r)}}var ft=class extends Error{userMessage;code;details;constructor(e,t,r,i){super(e),this.userMessage=t,this.code=r,this.details=i,this.name="Base64Error"}},vr={INVALID_INPUT:"Invalid data format. Please try again.",DECODE_FAILED:"Unable to decode data. The data may be corrupted.",ENCODE_FAILED:"Unable to encode data. Please try again.",INVALID_BASE64URL:"Invalid base64url format."};function vn(n){try{if(!n)throw new ft("Empty bytes input",vr.INVALID_INPUT,"EMPTY_BYTES");if(!(n instanceof Uint8Array))throw new ft(`Invalid bytes input type: ${typeof n}`,vr.INVALID_INPUT,"INVALID_BYTES_TYPE",{actualType:typeof n});let e="";for(let t of n)e+=String.fromCharCode(t);return btoa(e).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}catch(e){throw e instanceof ft?e:(console.error("[base64url] Strict encode failed:",e),new ft(`Failed to encode strict base64url: ${e}`,vr.ENCODE_FAILED,"STRICT_ENCODE_FAILED",e))}}var bn=Nr(ko(),1),Ga=typeof bn.default.default=="function"?bn.default.default:bn.default,_n=class{qr;container=null;observer=null;constructor(e,t=""){this.container=e,this.observer=new MutationObserver(()=>{let i=e.querySelector("canvas");i&&!i.hasAttribute("role")&&(i.setAttribute("role","img"),i.setAttribute("aria-label","QR code for age verification"))}),this.observer.observe(e,{childList:!0,subtree:!0}),this.qr=new Ga({width:200,height:200,type:"canvas",data:t,dotsOptions:{type:"dots",gradient:{type:"linear",rotation:0,colorStops:[{offset:0,color:"#0091C7"},{offset:1,color:"#B664F8"}]}},cornersSquareOptions:{type:"extra-rounded",gradient:{type:"linear",rotation:180,colorStops:[{offset:0,color:"#0091C7"},{offset:1,color:"#B664F8"}]}},cornersDotOptions:{type:"square",color:"#B664F8"},backgroundOptions:{color:"#ffffff"},qrOptions:{typeNumber:0,mode:"Byte",errorCorrectionLevel:"Q"}}),this.qr.append(e);let r=e.querySelector("canvas");r&&(r.setAttribute("role","img"),r.setAttribute("aria-label","QR code for age verification"))}update(e){if(this.qr.update({data:e}),this.container){let t=this.container.querySelector("canvas");t&&(t.setAttribute("role","img"),t.setAttribute("aria-label","QR code for age verification"))}}destroy(){this.observer&&(this.observer.disconnect(),this.observer=null),this.container&&(this.container.innerHTML="")}};var En=class{wsUrl;sessionId;ws=null;closed=!1;opened=!1;constructor(e,t){this.wsUrl=e,this.sessionId=t}waitForNotification(){return new Promise((e,t)=>{if(this.closed){t(new Error("WebSocketManager already closed"));return}try{this.ws=new WebSocket(this.wsUrl)}catch{t(new Error("WebSocket construction failed"));return}let r=setTimeout(()=>{this.close(),t(new Error("WebSocket connection timeout"))},5e3);this.ws.onopen=()=>{clearTimeout(r),this.opened=!0,console.debug(`[AgeGate] WebSocket connected for session ${this.sessionId.slice(0,8)}`)},this.ws.onmessage=i=>{try{let o=JSON.parse(i.data);o.type==="status_change"&&(console.debug("[AgeGate] WebSocket notification received:",o.status),e(o))}catch{}},this.ws.onerror=()=>{clearTimeout(r),this.close(),t(new Error("WebSocket error"))},this.ws.onclose=i=>{clearTimeout(r),this.ws=null,i.reason==="Session expired"&&t(new Error("Session expired")),t(new Error(`WebSocket closed: ${i.code} ${i.reason}`))}})}close(){if(this.closed=!0,this.ws){try{this.ws.close(1e3,"Client cleanup")}catch{}this.ws=null}}get isConnected(){return this.ws!==null&&this.ws.readyState===WebSocket.OPEN}get wasConnected(){return this.opened}};var Mo={maxRetries:3,initialDelay:1e3,maxDelay:1e4,backoffMultiplier:2},_r={production:"https://hosted.provii.app",sandbox:"https://sandbox-hosted.provii.app"},xn={environment:"production",apiEndpoint:_r.production,timeout:1e4,debug:!1},Po={production:"__Host-session",sandbox:"__Host-session-sandbox"},Er="provii_pkce_",gt={initialInterval:3e3,maxInterval:1e4,backoffMultiplier:1.3,timeout:3e5};var Sn=class extends Error{constructor(e){super(e),this.name="PKCEError"}},xr=class{map=new Map;get length(){return this.map.size}clear(){this.map.clear()}getItem(e){return this.map.get(e)??null}key(e){return Array.from(this.map.keys())[e]??null}removeItem(e){this.map.delete(e)}setItem(e,t){this.map.set(e,t)}},pt=class n{storage;debug;constructor(e=!1){this.storage=n.resolveStorage(),this.debug=e}static resolveStorage(){try{let e="__pkce_storage_test__";return globalThis.sessionStorage.setItem(e,"1"),globalThis.sessionStorage.removeItem(e),globalThis.sessionStorage}catch{return new xr}}async generateChallenge(){this.log("Generating PKCE challenge");let e=this.generateVerifier(),t=await this.generateChallengeFromVerifier(e);return this.log("PKCE challenge generated",{verifierLength:e.length,challengeLength:t.length}),{verifier:e,challenge:t}}storeVerifier(e,t){this.log("Storing verifier",{sessionId:e});let r=this.getStorageKey(e);this.storage.setItem(r,t)}getVerifier(e){this.log("Retrieving verifier",{sessionId:e});let t=this.getStorageKey(e),r=this.storage.getItem(t);return r||(this.log("Verifier not found",{sessionId:e}),null)}clearVerifier(e){this.log("Clearing verifier",{sessionId:e});let t=this.getStorageKey(e);this.storage.removeItem(t)}clearAllVerifiers(){this.log("Clearing all verifiers");let e=[];for(let t=0;t<this.storage.length;t++){let r=this.storage.key(t);r&&r.startsWith(Er)&&e.push(r)}e.forEach(t=>this.storage.removeItem(t))}generateVerifier(){if(!globalThis.crypto||!globalThis.crypto.getRandomValues)throw new Sn("Web Crypto API is not available");let e=new Uint8Array(32);return globalThis.crypto.getRandomValues(e),this.base64UrlEncode(e)}async generateChallengeFromVerifier(e){if(!globalThis.crypto||!globalThis.crypto.subtle)throw new Sn("Web Crypto API (SubtleCrypto) is not available");let r=new TextEncoder().encode(e),i=await globalThis.crypto.subtle.digest("SHA-256",r),o=new Uint8Array(i);return this.base64UrlEncode(o)}base64UrlEncode(e){return this.arrayBufferToBase64(e).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"")}arrayBufferToBase64(e){let t="";for(let r=0;r<e.byteLength;r++)t+=String.fromCharCode(e[r]);return globalThis.btoa(t)}getStorageKey(e){return`${Er}${e}`}log(e,t){this.debug&&console.debug(`[PKCEManager] ${e}`,t||"")}};var Oo=`/* agegate.css - Provii Age Gate Responsive Styles
 *
 * Theme system using CSS custom properties with automatic dark mode detection.
 * Brand colours: #0091C7 (teal) to #B664F8 (purple).
 * Font: Manrope with system fallback stack.
 *
 * Breakpoints:
 *   < 360px  - small phones (full-width, no border-radius)
 *   360-767px - standard mobile (full-width, rounded)
 *   768px+   - tablet/desktop (420px max, centred)
 */

/* ------------------------------------------------------------------ */
/*  Shadow host base                                                   */
/* ------------------------------------------------------------------ */
:host {
  display: block;
}

/* ------------------------------------------------------------------ */
/*  Light theme (default)                                              */
/* ------------------------------------------------------------------ */
:host {
  --ag-bg: #FFFFFF;
  --ag-bg-subtle: #F8FAFC;
  --ag-border: #E5E7EB;
  --ag-text: #1F2937;
  --ag-text-secondary: #6B7280;
  --ag-text-muted: #6B7280;
  --ag-accent-start: #007AA8;
  --ag-focus-outline: #007AA8;
  --ag-accent-end: #8B3FD9;
  --ag-accent-gradient: linear-gradient(135deg, #007AA8 0%, #8B3FD9 100%);
  --ag-success: #047857;
  --ag-success-bg: #F0FDF4;
  --ag-success-border: #BBF7D0;
  --ag-error: #C62020;
  --ag-error-bg: #FEF2F2;
  --ag-error-border: #FECACA;
  --ag-warning: #D97706;
  --ag-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  --ag-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --ag-focus-ring: 0 0 0 3px rgba(0, 122, 168, 0.4);
  --ag-qr-bg: #FFFFFF;
  --ag-qr-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  --ag-overlay-shadow: 0 0 0 6px rgba(0, 0, 0, 0.5);
}

/* ------------------------------------------------------------------ */
/*  Dark theme (explicit attribute)                                    */
/* ------------------------------------------------------------------ */
:host([data-agegate-theme="dark"]) {
  --ag-bg: #0F172A;
  --ag-bg-subtle: #1E293B;
  --ag-border: #1E293B;
  --ag-text: #F1F5F9;
  --ag-text-secondary: #94A3B8;
  --ag-text-muted: #8B9BB5;
  --ag-focus-outline: #FFFFFF;
  --ag-success: #34D399;
  --ag-success-bg: rgba(5, 150, 105, 0.15);
  --ag-success-border: rgba(52, 211, 153, 0.3);
  --ag-error: #F87171;
  --ag-error-bg: rgba(220, 38, 38, 0.15);
  --ag-error-border: rgba(248, 113, 113, 0.3);
  --ag-warning: #FBBF24;
  --ag-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  --ag-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  --ag-focus-ring: 0 0 0 3px rgba(139, 63, 217, 0.5);
  --ag-qr-bg: #FFFFFF;
  --ag-qr-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --ag-overlay-shadow: 0 0 0 6px rgba(255, 255, 255, 0.3);
}

/* ------------------------------------------------------------------ */
/*  Auto dark mode fallback (when no explicit theme is set)            */
/* ------------------------------------------------------------------ */
@media (prefers-color-scheme: dark) {
  :host:not([data-agegate-theme="light"]) {
    --ag-bg: #0F172A;
    --ag-bg-subtle: #1E293B;
    --ag-border: #1E293B;
    --ag-text: #F1F5F9;
    --ag-text-secondary: #94A3B8;
    --ag-text-muted: #8B9BB5;
    --ag-focus-outline: #FFFFFF;
    --ag-success: #34D399;
    --ag-success-bg: rgba(5, 150, 105, 0.15);
    --ag-success-border: rgba(52, 211, 153, 0.3);
    --ag-error: #F87171;
    --ag-error-bg: rgba(220, 38, 38, 0.15);
    --ag-error-border: rgba(248, 113, 113, 0.3);
    --ag-warning: #FBBF24;
    --ag-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    --ag-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
    --ag-focus-ring: 0 0 0 3px rgba(139, 63, 217, 0.5);
    --ag-qr-bg: #FFFFFF;
    --ag-qr-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    --ag-overlay-shadow: 0 0 0 6px rgba(255, 255, 255, 0.3);
  }
}

/* ------------------------------------------------------------------ */
/*  Reset and base styles                                              */
/* ------------------------------------------------------------------ */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  height: 100%;
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--ag-accent-gradient);
  min-height: 100vh;
  min-height: -webkit-fill-available;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  padding: env(safe-area-inset-top, 20px) env(safe-area-inset-right, 20px) env(safe-area-inset-bottom, 20px) env(safe-area-inset-left, 20px);
  color: var(--ag-text);
  line-height: 1.5;
}

/* ------------------------------------------------------------------ */
/*  Container                                                          */
/* ------------------------------------------------------------------ */
.container {
  background: var(--ag-bg);
  border: 1px solid var(--ag-border);
  border-radius: 16px;
  box-shadow: var(--ag-shadow);
  max-width: 420px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.container::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */
.header {
  background: var(--ag-accent-gradient);
  padding: 28px 24px;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
  animation: float 25s infinite linear;
}

@keyframes float {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.logo svg {
  width: 32px;
  height: 32px;
  stroke-width: 1.5;
}

.header h1,
.header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: -0.3px;
  position: relative;
  z-index: 1;
}

.header p {
  font-size: 0.875rem;
  line-height: 1.5;
  position: relative;
  z-index: 1;
  max-width: 300px;
  margin: 0 auto;
}

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */
.content {
  padding: 28px 24px;
  text-align: center;
}

.age-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--ag-bg-subtle);
  padding: 8px 16px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--ag-accent-start);
  margin-bottom: 24px;
  border: 1px solid var(--ag-border);
}

.age-badge svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* ------------------------------------------------------------------ */
/*  Gate container (holds QR code)                                     */
/* ------------------------------------------------------------------ */
.gate-container {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--ag-bg-subtle);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  position: relative;
  border: 1px solid var(--ag-border);
}

.gate-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 200px;
}

/* ------------------------------------------------------------------ */
/*  QR code canvas - single 200px rendering path                       */
/* ------------------------------------------------------------------ */
.gate-container canvas,
.qr-canvas {
  display: block !important;
  width: 200px;
  height: auto;
  aspect-ratio: 1;
  max-width: 100% !important;
  margin: 0 auto;
  border-radius: 8px;
  box-shadow: var(--ag-qr-shadow);
  background: var(--ag-qr-bg);
  padding: 8px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* ------------------------------------------------------------------ */
/*  Mobile CTA button                                                  */
/* ------------------------------------------------------------------ */
.gate-container .agegate-link {
  background: var(--ag-accent-gradient);
  color: white;
  border: none;
  padding: 14px 28px;
  min-height: 48px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  box-shadow: 0 4px 16px rgba(0, 145, 199, 0.3);
  width: 100%;
  max-width: 280px;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: visible;
  text-decoration: none;
  text-align: center;
  display: inline-block;
}

.gate-container .agegate-link:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 145, 199, 0.4);
}

.gate-container .agegate-link:active {
  transform: translateY(0);
  opacity: 0.85;
}

.gate-container .agegate-link:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* ------------------------------------------------------------------ */
/*  Gate instructions                                                  */
/* ------------------------------------------------------------------ */
.gate-container .agegate-caption,
.gate-container .agegate-instructions {
  margin-top: 16px;
  font-size: 0.875rem;
  color: var(--ag-text-secondary);
  line-height: 1.5;
}

/* ------------------------------------------------------------------ */
/*  Status messages                                                    */
/* ------------------------------------------------------------------ */
.status-message {
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 32px;
  flex-wrap: wrap;
  transition: all 0.2s ease;
}

.status-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.status-loading {
  color: var(--ag-accent-start);
}

.status-info {
  color: var(--ag-text-secondary);
}

.status-error {
  color: var(--ag-error);
  background: var(--ag-error-bg);
  padding: 12px 20px;
  border-radius: 8px;
  margin-top: 10px;
  border: 1px solid var(--ag-error-border);
}

.status-success {
  color: var(--ag-success);
  background: var(--ag-success-bg);
  padding: 12px 20px;
  border-radius: 8px;
  margin-top: 10px;
  border: 1px solid var(--ag-success-border);
}

/* ------------------------------------------------------------------ */
/*  Spinner                                                            */
/* ------------------------------------------------------------------ */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--ag-border);
  border-top-color: var(--ag-accent-start);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ------------------------------------------------------------------ */
/*  Retry button                                                       */
/* ------------------------------------------------------------------ */
.retry-button {
  display: block;
  margin: 12px auto 0;
  padding: 10px 24px;
  min-height: 44px;
  background: var(--ag-bg);
  color: var(--ag-accent-start);
  border: 2px solid var(--ag-accent-start);
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.retry-button:hover {
  background: var(--ag-accent-start);
  color: white;
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
.footer {
  padding: 20px 24px;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--ag-text-secondary);
}

.footer a {
  color: var(--ag-accent-start);
  text-decoration: underline;
  font-weight: 700;
  transition: color 0.2s ease;
}

.footer a:hover {
  color: var(--ag-accent-end);
}

.footer-subtitle {
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--ag-text-muted);
}

.tech-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ag-border);
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.6875rem;
  color: var(--ag-text-muted);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tech-info .separator {
  color: var(--ag-text-muted);
}

/* ------------------------------------------------------------------ */
/*  Focus indicators                                                   */
/* ------------------------------------------------------------------ */
.gate-container .agegate-link:focus-visible,
.retry-button:focus-visible {
  outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start));
  outline-offset: 2px;
  box-shadow: var(--ag-focus-ring);
}

.footer a:focus-visible {
  outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start));
  outline-offset: 2px;
  border-radius: 2px;
}

/* ------------------------------------------------------------------ */
/*  Responsive: small phones (< 360px)                                 */
/* ------------------------------------------------------------------ */
@media screen and (max-width: 359px) {
  .container {
    border-radius: 0;
    max-height: none;
    border-left: none;
    border-right: none;
  }

  .header {
    padding: 20px 16px;
  }

  .header h1,
  .header h2 {
    font-size: 1.25rem;
  }

  .header p {
    font-size: 0.8125rem;
  }

  .content {
    padding: 20px 16px;
  }

  .gate-container {
    padding: 16px;
    min-height: 200px;
  }

  .gate-container canvas,
  .qr-canvas {
    width: 160px;
  }
}

/* ------------------------------------------------------------------ */
/*  Responsive: tablets and desktop (768px+)                           */
/* ------------------------------------------------------------------ */
@media screen and (min-width: 768px) {
  body {
    padding: 40px;
  }

  .container {
    box-shadow: var(--ag-shadow-lg);
  }

  .header {
    padding: 32px;
  }

  .logo {
    width: 72px;
    height: 72px;
  }

  .logo svg {
    width: 36px;
    height: 36px;
  }

  .header h1,
  .header h2 {
    font-size: 1.625rem;
  }

  .header p {
    font-size: 0.9375rem;
  }

  .content {
    padding: 32px;
  }
}

/* ------------------------------------------------------------------ */
/*  Landscape orientation                                              */
/* ------------------------------------------------------------------ */
@media screen and (orientation: landscape) and (max-height: 600px) {
  body {
    padding: 10px;
  }

  .container {
    max-width: 520px;
  }

  .header {
    padding: 16px 24px;
  }

  .logo {
    width: 48px;
    height: 48px;
  }

  .header h1,
  .header h2 {
    font-size: 1.25rem;
  }

  .content {
    padding: 16px 24px;
  }

  .gate-container {
    min-height: 180px;
    padding: 12px;
  }

  .gate-container canvas,
  .qr-canvas {
    width: 160px;
  }
}

/* ------------------------------------------------------------------ */
/*  Touch device adjustments                                           */
/* ------------------------------------------------------------------ */
@media (hover: none) and (pointer: coarse) {
  .gate-container .agegate-link:hover {
    transform: none;
    opacity: 1;
  }

  .gate-container .agegate-link:active {
    transform: scale(0.98);
    opacity: 0.85;
  }
}

/* ------------------------------------------------------------------ */
/*  High DPI displays                                                  */
/* ------------------------------------------------------------------ */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .gate-container canvas,
  .qr-canvas {
    image-rendering: auto;
  }
}

/* ------------------------------------------------------------------ */
/*  Print                                                              */
/* ------------------------------------------------------------------ */
@media print {
  body {
    background: white;
  }

  .container {
    box-shadow: none;
    border: 1px solid var(--ag-border);
  }

  .header {
    background: none;
    color: var(--ag-text);
    border-bottom: 2px solid var(--ag-accent-start);
  }
}

/* ------------------------------------------------------------------ */
/*  Reduced motion                                                     */
/* ------------------------------------------------------------------ */
@media (prefers-reduced-motion: reduce) {
  .container {
    animation: none;
  }

  .header::before {
    animation: none;
  }

  .spinner {
    animation: none;
    opacity: 0.7;
  }

  .gate-container .agegate-link,
  .retry-button,
  .footer a,
  .status-message {
    transition: none;
  }
}
`;var Lo=new WeakMap;function Oe(n,e){let t=Lo.get(n);if(t)return t;let r=n.attachShadow({mode:"closed"});return Lo.set(n,r),Sr(r,Oo,e),r}function Sr(n,e,t){let r=document.createElement("style");return t&&r.setAttribute("nonce",t),r.textContent=e,n.appendChild(r),r}var O={styledQRInstance:null,wsManager:null,wsFailed:!1,wsWasConnected:!1,wsPromise:null,visibilityCleanup:null};function Do(){O.wsManager&&O.wsManager.close(),O.styledQRInstance&&O.styledQRInstance.destroy(),O.visibilityCleanup&&O.visibilityCleanup(),O={styledQRInstance:null,wsManager:null,wsFailed:!1,wsWasConnected:!1,wsPromise:null,visibilityCleanup:null}}function Bo(){if(typeof document>"u")return()=>{};let n=()=>{document.visibilityState==="visible"&&O.wsManager&&!O.wsManager.isConnected&&(console.debug("[AgeGate] WebSocket closed while tab was hidden, falling back to polling"),O.wsFailed=!0,O.wsWasConnected=!0,O.wsManager.close(),O.wsManager=null,O.wsPromise=null)};document.addEventListener("visibilitychange",n);let e=()=>{document.removeEventListener("visibilitychange",n)};return O.visibilityCleanup=e,e}function yt(){return O.wsWasConnected}var mt=3e4,ja=6e4,Ar="Verify with Provii Wallet",Ir="agegate-qr-container-hidden",An="aria-disabled",se={NETWORK_ERROR:"Unable to connect to verification service. Please check your connection and try again.",TIMEOUT_ERROR:"Request timed out. Please check your connection and try again.",VALIDATION_ERROR:"Invalid verification challenge. Please refresh the page.",EXPIRED_CHALLENGE:"This verification challenge has expired. Please refresh to get a new one.",MISSING_CONFIG:"Configuration error. Please refresh the page.",MOUNT_ERROR:"Unable to display verification interface. Please refresh the page."},X=class extends Error{userMessage;code;details;constructor(e,t,r,i){super(e),this.userMessage=t,this.code=r,this.details=i,this.name="AgeGateError"}},je=new pt;async function Ka(){try{let{verifier:n,challenge:e}=await je.generateChallenge();return{code_verifier:n,code_challenge:e}}catch(n){throw console.error("[AgeGate] PKCE generation failed:",n),new X("Failed to generate PKCE parameters",se.VALIDATION_ERROR,"PKCE_GENERATION_FAILED",n)}}function Wa(n,e){if(!n.startsWith("wss://"))throw new X(`WebSocket URL must use wss:// protocol, got: ${n.slice(0,40)}`,se.VALIDATION_ERROR,"INVALID_WS_PROTOCOL");try{let t=new URL(n).hostname.toLowerCase(),r=new URL(e).hostname.toLowerCase();if(t!==r)throw new X(`WebSocket hostname "${t}" does not match API hostname "${r}"`,se.VALIDATION_ERROR,"WS_HOSTNAME_MISMATCH")}catch(t){throw t instanceof X?t:new X("Failed to parse WebSocket URL",se.VALIDATION_ERROR,"WS_URL_PARSE_FAILED",t)}}function Cr(n){try{let e=window.location.origin,t=new URL(n,e).origin;if(t!==e){console.error(`[AgeGate] Blocked cross-origin redirect: target origin "${t}" does not match current origin "${e}"`);return}}catch{console.error("[AgeGate] Blocked redirect: failed to parse target URL");return}window.location.href=n}function $o(n){if(typeof n.cutoff_days!="number"||n.cutoff_days<=0)return null;let t=Math.floor(Date.now()/864e5)-n.cutoff_days,r=Math.floor(t/365.25);return r<1||r>150?null:n.proof_direction==="under_age"?`Verify you are under ${r}`:`Verify you are ${r} or older`}async function Qa(n,e,t,r){if(r.environment!=="sandbox")throw new X("simulateProof is only available in sandbox environment","Simulation is only available in sandbox mode","SIMULATE_NOT_SANDBOX");let i=r.challengeUrl.replace(/\/challenge$/,"")+"/sandbox/simulate-proof",o=await Pe(i,{method:"POST",headers:{"Content-Type":"application/json","X-Public-Key":r.publicKey},body:JSON.stringify({challenge_id:n,submit_secret:e,outcome:t})},mt);if(!o.ok){let s="";try{s=`: ${await o.text()}`}catch{}throw new X(`Simulate proof failed (${o.status})${s}`,"Simulation request failed. Please try again.",`SIMULATE_HTTP_${o.status}`)}}function Ja(n,e){let t="agegate-sandbox-styles";if(n.querySelector(`#${t}`))return;let r=document.createElement("style");r.id=t,e&&r.setAttribute("nonce",e),r.textContent=`
    .agegate-sandbox-section {
      margin-top: 16px;
      padding: 12px 16px;
      border-top: 2px dashed var(--ag-border, #E5E7EB);
      text-align: center;
    }

    .agegate-sandbox-label {
      margin: 0 0 8px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--ag-text-muted, #6B7280);
    }

    .agegate-sandbox-buttons {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .agegate-sandbox-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      border-width: 1px;
      border-style: solid;
      transition: opacity 0.15s ease;
    }

    .agegate-sandbox-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .agegate-sandbox-btn:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #007AA8));
      outline-offset: 2px;
      box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 122, 168, 0.4));
    }

    .agegate-sandbox-pass {
      background: #ecfdf5;
      color: #065f46;
      border-color: #6ee7b7;
    }

    .agegate-sandbox-fail {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fca5a5;
    }

    @media (prefers-color-scheme: dark) {
      .agegate-sandbox-pass {
        background: #064e3b;
        color: #a7f3d0;
        border-color: #065f46;
      }

      .agegate-sandbox-fail {
        background: #7f1d1d;
        color: #fecaca;
        border-color: #991b1b;
      }

      .agegate-sandbox-section {
        border-top-color: var(--ag-border, #374151);
      }

      .agegate-sandbox-label {
        color: var(--ag-text-muted, #9CA3AF);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .agegate-sandbox-btn {
        transition: none;
      }
    }
  `,n.appendChild(r)}function Uo(n,e,t,r){if(t.environment!=="sandbox")return;let i=document.createElement("div");i.className="agegate-sandbox-section",i.setAttribute("role","region"),i.setAttribute("aria-labelledby","agegate-sandbox-heading");let o=document.createElement("h3");o.id="agegate-sandbox-heading",o.className="agegate-sandbox-label",o.textContent="Sandbox Testing",i.appendChild(o);let s=document.createElement("div");s.className="agegate-sandbox-buttons";let l=document.createElement("button");l.type="button",l.className="agegate-sandbox-btn agegate-sandbox-pass",l.textContent="\u2713 Simulate Pass",l.setAttribute("aria-label","Simulate successful age verification");let d=document.createElement("button");d.type="button",d.className="agegate-sandbox-btn agegate-sandbox-fail",d.textContent="\u2717 Simulate Fail",d.setAttribute("aria-label","Simulate failed age verification");let g=l.textContent,S=d.textContent;async function w(_,I,L){l.disabled=!0,d.disabled=!0,I.setAttribute("aria-busy","true"),I.textContent="Simulating...";try{await Qa(e.challenge_id,e.submit_secret,_,t),I.textContent=_==="verified"?"\u2713 Simulated":"\u2717 Simulated",I.removeAttribute("aria-busy");let U=n.querySelector('[aria-live="polite"]');if(U){let G=U.querySelector("span");G&&(G.textContent="Simulation submitted, verifying...")}}catch(U){l.disabled=!1,d.disabled=!1,I.removeAttribute("aria-busy"),I.textContent=L,console.error("[AgeGate] Simulation failed:",U)}}l.addEventListener("click",()=>{w("verified",l,g)}),d.addEventListener("click",()=>{w("age_not_met",d,S)}),s.appendChild(l),s.appendChild(d),i.appendChild(s);let m=n.querySelector(".content");m&&m.appendChild(i),Ja(n,r)}function Ht(n){let e=Array.from(n.childNodes);for(let t of e)t instanceof HTMLStyleElement||n.removeChild(t)}function Ya(n,e,t,r){try{let i=Oe(n,r.cfg.cspNonce);Ht(i);let o=document.createElement("div");for(o.innerHTML=`
      <div class="container" lang="en" role="region" aria-label="Age verification">
        <div class="header">
          <div class="logo">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <h2>Age Verification</h2>
          <p id="agegate-age-subtitle-mobile">Verify your age privately</p>
        </div>
        <div class="content">
          <div class="gate-container">
            <a class="agegate-link agegate-mobile-cta" id="agegate-mobile-btn">
              Verify with Provii Wallet
            </a>
          </div>
          <div class="status-message status-info" role="status" aria-live="polite">
            <span>Tap to verify your age securely</span>
          </div>
          <p class="agegate-time-notice">You have 5 minutes to complete verification. If time runs out, you will need to start a new verification.</p>
          <div class="agegate-qr-toggle-section">
            <p class="agegate-qr-toggle-label">Or scan with another device:</p>
            <button id="agegate-show-qr" class="retry-button agegate-qr-toggle-btn" aria-expanded="false" aria-controls="agegate-qr-container">Show <abbr title="Quick Response">QR</abbr> Code</button>
          </div>
          <div id="agegate-qr-container" class="agegate-qr-container-hidden"></div>
          <p class="agegate-help-link-container"><a href="https://provii.app/help" target="_blank" rel="noopener" aria-label="Need help with age verification? (opens in new tab)" class="agegate-help-link">Need help?</a></p>
        </div>
        <div class="footer">
          <p>Powered by <a href="https://provii.app" target="_blank" rel="noopener" aria-label="Provii Wallet (opens in new tab)" class="agegate-footer-link">Provii Wallet</a></p>
          <p class="footer-subtitle">Privacy preserving age verification</p>
        </div>
      </div>
    `;o.firstChild;)i.appendChild(o.firstChild);let s=$o(r.challenge);if(s){let w=i.querySelector("#agegate-age-subtitle-mobile");w&&(w.textContent=s)}let l=i.querySelector("#agegate-mobile-btn");if(!(l instanceof HTMLAnchorElement))throw new Error("Missing required element: #agegate-mobile-btn");l.setAttribute("href",e);let d=i.querySelector("#agegate-show-qr");if(!(d instanceof HTMLButtonElement))throw new Error("Missing required element: #agegate-show-qr");let g=i.querySelector("#agegate-qr-container");if(!(g instanceof HTMLDivElement))throw new Error("Missing required element: #agegate-qr-container");l.addEventListener("keydown",w=>{l.getAttribute(An)==="true"&&(w.key==="Enter"||w.key===" ")&&w.preventDefault()}),l.addEventListener("click",async w=>{try{sessionStorage.setItem("agegate_pending_verification","true")}catch(m){console.warn("[AgeGate] Could not store pending state:",m)}l.style.opacity="0.7",l.textContent="Opening Provii Wallet...",setTimeout(()=>{window.location.href=e},100),setTimeout(()=>{l.textContent=Ar,l.style.opacity="1"},3e3)}),d.addEventListener("click",async()=>{if(g.classList.contains(Ir))try{g.innerHTML="";let m=document.createElement("canvas");m.className="qr-canvas agegate-qr-canvas",m.setAttribute("role","img"),m.setAttribute("aria-label","QR code for age verification"),g.appendChild(m);let _=JSON.stringify(t);await qt(m,_,{width:200,margin:1}),g.classList.remove(Ir),d.innerHTML='Hide <abbr title="Quick Response">QR</abbr> Code',d.setAttribute("aria-expanded","true")}catch(m){console.error("[AgeGate] Failed to generate QR:",m),d.textContent="QR Generation Failed",d.disabled=!0}else g.classList.add(Ir),d.innerHTML='Show <abbr title="Quick Response">QR</abbr> Code',d.setAttribute("aria-expanded","false")});let S=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;document.addEventListener("visibilitychange",async()=>{if(!(document.visibilityState!=="visible"||sessionStorage.getItem("agegate_pending_verification")!=="true")){sessionStorage.removeItem("agegate_pending_verification"),l.textContent="Checking verification...",l.style.background="var(--ag-success, #047857)",l.style.color="#ffffff",l.style.pointerEvents="none",l.setAttribute(An,"true");try{let m;if(r.cfg?.redeemMode==="rp-proxy"&&r.cfg?.pollUrl)m=await Pe(r.cfg.pollUrl,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({challengeId:r.sessionId})},1e4);else{let I=r.statusUrl.replace("{sid}",encodeURIComponent(r.sessionId));m=await Pe(I,{method:"GET",headers:{Accept:"application/json","X-Public-Key":r.cfg?.publicKey??""},credentials:"include",redirect:"error"},1e4)}if(!m.ok)throw new Error(`Status check failed: ${m.status}`);let _=await m.json();if(_.status==="verified"){Cr(r.contentUrl);return}if(_.status==="proof_ok_waiting_for_redeem"){let I=je.getVerifier(r.sessionId);if(!I)throw new Error("PKCE verifier not found");await Tr(r.sessionId,I,r.cfg,1e4),je.clearVerifier(r.sessionId),Cr(r.contentUrl);return}l.textContent=Ar,l.style.background="",l.style.pointerEvents="",l.removeAttribute(An)}catch(m){console.error("[AgeGate] Error checking verification status:",m),l.textContent=Ar,l.style.background="",l.style.pointerEvents="",l.removeAttribute(An)}}}),Uo(i,r.challenge,r.cfg,r.cfg.cspNonce),Rr(i,r.cfg.cspNonce)}catch(i){throw console.error("[AgeGate] Failed to render mobile challenge:",i),new X("Failed to render mobile interface",se.MOUNT_ERROR,"RENDER_MOBILE_FAILED",i)}}async function Xa(n,e,t,r){let i=r.cspNonce;try{let o=Oe(n,i);if(Ht(o),O.styledQRInstance&&(O.styledQRInstance.destroy(),O.styledQRInstance=null),!/^\d{12}$/.test(t.short_code))throw new X("Invalid short_code from server: expected 12 digits",se.VALIDATION_ERROR,"INVALID_SHORT_CODE");let l=t.short_code.replace(/(\d{4})(\d{4})(\d{4})/,"$1 $2 $3"),d=document.createElement("div");for(d.innerHTML=`
      <div class="container" lang="en" role="region" aria-label="Age verification">
        <div class="header">
          <div class="logo">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <h2>Age Verification</h2>
          <p id="agegate-age-subtitle">Verify your age privately</p>
        </div>
        <div class="content">
          <div class="gate-container" id="agegate-qr-container" aria-describedby="agegate-scan-instruction">
            <div class="gate-loading" aria-hidden="true">
              <div class="spinner" aria-hidden="true"></div>
            </div>
          </div>
          <div class="status-message status-info" id="agegate-scan-instruction" role="status" aria-live="polite">
            <span>Scan the <abbr title="Quick Response">QR</abbr> code with Provii Wallet to verify your age</span>
          </div>
          <div class="agegate-short-code" role="region" aria-labelledby="agegate-shortcode-label">
            <p id="agegate-shortcode-label" class="agegate-shortcode-label">Or enter this code manually:</p>
            <p class="agegate-shortcode-value" id="agegate-shortcode-display"></p>
          </div>
          <p class="agegate-time-notice">You have 5 minutes to complete verification. If time runs out, you will need to start a new verification.</p>
          <p class="agegate-help-link-container agegate-help-link-container-tight"><a href="https://provii.app/help" target="_blank" rel="noopener" aria-label="Need help with age verification? (opens in new tab)" class="agegate-help-link">Need help?</a></p>
        </div>
        <div class="footer">
          <p>Powered by <a href="https://provii.app" target="_blank" rel="noopener" aria-label="Provii Wallet (opens in new tab)" class="agegate-footer-link">Provii Wallet</a></p>
          <p class="footer-subtitle">Privacy preserving age verification</p>
        </div>
      </div>
    `;d.firstChild;)o.appendChild(d.firstChild);let g=o.querySelector("#agegate-shortcode-display");g&&(g.textContent=l);let S=$o(t);if(S){let _=o.querySelector("#agegate-age-subtitle");_&&(_.textContent=S)}let w=o.querySelector("#agegate-qr-container");if(!w)throw new Error("QR container not found");w.innerHTML="";let m=JSON.stringify(e);O.styledQRInstance=new _n(w,m),Uo(o,t,r,i),Rr(o,i)}catch(o){console.error("[AgeGate] Failed to render desktop challenge:",o);try{let s=Oe(n,i);Ht(s);let l=document.createElement("canvas");s.appendChild(l),l.setAttribute("role","img"),l.setAttribute("aria-label","QR code for age verification");let d=JSON.stringify(e);await qt(l,d)}catch(s){console.error("[AgeGate] Fallback QR also failed:",s)}throw new X("Failed to render desktop interface",se.MOUNT_ERROR,"RENDER_DESKTOP_FAILED",o)}}function Za(n,e,t){try{let r=document.getElementById(n);if(!r){console.error("[AgeGate] Mount element not found for error display");return}let i=Oe(r,t);Ht(i);let o=e instanceof X?e.userMessage:se.VALIDATION_ERROR,s=e instanceof X&&e.code?`(${e.code})`:"",l=document.createElement("div");for(l.innerHTML=`
      <div role="alert" lang="en" class="agegate-error-alert">
        <h2>Age Verification Error</h2>
        <p class="agegate-error-message" id="agegate-error-msg"></p>
        <p class="agegate-error-details" id="agegate-error-code" aria-hidden="true"></p>
        <button class="retry-button agegate-error-retry">Try Again</button>
        <p class="agegate-help-link-container"><a href="https://provii.app/help" target="_blank" rel="noopener" aria-label="Need help with age verification? (opens in new tab)" class="agegate-help-link">Need help?</a></p>
      </div>`;l.firstChild;)i.appendChild(l.firstChild);let d=i.querySelector("#agegate-error-msg");d&&(d.textContent=o);let g=i.querySelector("#agegate-error-code");g&&(s?g.textContent=s:g.remove());let S=i.querySelector(".agegate-error-retry");S&&S.addEventListener("click",()=>{window.location.reload()}),Rr(i,t)}catch(r){console.error("[AgeGate] Failed to render error state:",r)}}function Rr(n,e){let t="agegate-ms-styles";if(n.querySelector(`#${t}`))return;let r=document.createElement("style");r.id=t,e&&r.setAttribute("nonce",e),r.textContent=`
    /* Focus styles using theme-aware CSS variables */
    #agegate-mobile-btn:focus-visible,
    #agegate-show-qr:focus-visible,
    #agegate-retry-btn:focus-visible,
    .retry-button:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #007AA8));
      outline-offset: 2px;
      box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 122, 168, 0.4));
    }
    [role="alert"] button:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #007AA8));
      outline-offset: 2px;
      box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 122, 168, 0.4));
    }
    a[href*="provii.app/help"]:focus-visible,
    .footer a:focus-visible {
      outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #007AA8));
      outline-offset: 2px;
      border-radius: 2px;
    }

    /* Mobile CTA button */
    .agegate-mobile-cta {
      min-height: 48px;
      display: inline-block;
    }

    /* Time notice */
    .agegate-time-notice {
      margin: 8px 0 0;
      color: var(--ag-text-muted, #6B7280);
      font-size: 0.75rem;
      text-align: center;
    }

    /* QR toggle section */
    .agegate-qr-toggle-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--ag-border, #E5E7EB);
      text-align: center;
    }

    .agegate-qr-toggle-label {
      margin: 0 0 12px;
      color: var(--ag-text-secondary, #6B7280);
      font-size: 0.8125rem;
    }

    .agegate-qr-toggle-btn {
      min-height: 44px;
    }

    /* QR container visibility */
    .agegate-qr-container-hidden {
      display: none;
    }

    #agegate-qr-container {
      margin-top: 20px;
      text-align: center;
    }

    /* QR canvas */
    .agegate-qr-canvas {
      display: block;
      width: 200px;
      height: 200px;
      max-width: 100%;
      margin: 0 auto;
      border-radius: 8px;
      box-shadow: var(--ag-qr-shadow, 0 4px 20px rgba(0, 0, 0, 0.08));
      background: var(--ag-qr-bg, #FFFFFF);
      padding: 8px;
    }

    /* Help link */
    .agegate-help-link-container {
      margin: 16px 0 0;
      font-size: 0.8125rem;
      text-align: center;
    }

    .agegate-help-link-container-tight {
      margin-top: 8px;
    }

    .agegate-help-link {
      color: var(--ag-accent-start, #007AA8);
      display: inline-block;
      padding: 12px 8px;
      min-height: 44px;
    }

    /* Footer link */
    .agegate-footer-link {
      display: inline-block;
      padding: 4px 8px;
      min-height: 44px;
    }

    /* Short code section */
    .agegate-short-code {
      margin-top: 16px;
      text-align: center;
    }

    .agegate-shortcode-label {
      margin: 0 0 8px;
      color: var(--ag-text-secondary, #6B7280);
      font-size: 0.8125rem;
    }

    .agegate-shortcode-value {
      margin: 0;
      color: var(--ag-accent-start, #007AA8);
      font-size: 1.125rem;
      font-weight: 700;
      font-family: 'SF Mono', Monaco, monospace;
      letter-spacing: 2px;
    }

    @media screen and (max-width: 359px) {
      .agegate-shortcode-value {
        font-size: 0.9375rem;
      }
    }

    /* Skeleton loading gate */
    .agegate-skeleton-gate {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
    }

    /* Error state */
    .agegate-error-alert {
      text-align: center;
      padding: 20px;
      color: var(--ag-text, #1F2937);
    }

    .agegate-error-message {
      margin: 20px 0;
      color: var(--ag-text-secondary, #6B7280);
    }

    .agegate-error-details {
      color: var(--ag-text-muted, #6B7280);
      font-size: 0.75rem;
      margin: 10px 0;
    }

    .agegate-error-retry {
      background: var(--ag-accent-gradient, linear-gradient(135deg, #007AA8 0%, #8B3FD9 100%));
      border: none;
      color: #fff;
      padding: 12px 24px;
      min-height: 44px;
      border-radius: 12px;
      cursor: pointer;
      margin-top: 20px;
      font-size: 1rem;
      font-weight: 700;
    }
  `,n.appendChild(r)}async function ec(n){let{code_verifier:e,code_challenge:t}=await Ka(),r={code_challenge:t};console.debug("[AgeGate] POST /v1/challenge request:",{url:n.challengeUrl,body:{...r,code_challenge:"[REDACTED]"}});let i=crypto.randomUUID(),o=await Pe(n.challengeUrl,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json","X-API-Version":"v1","X-Public-Key":n.publicKey,"Idempotency-Key":i},redirect:"error",body:JSON.stringify(r)},ja);if(!o.ok){let _="";try{let I=await o.text();_=`: ${I}`,console.error("[AgeGate] Challenge creation failed:",o.status,I)}catch{}throw new X(`Challenge create failed (${o.status})${_}`,se.NETWORK_ERROR,`HTTP_${o.status}`)}let s=await zt(o);console.debug("[AgeGate] Challenge created:",{challenge_id:s.challenge_id,expires_at:s.expires_at,cutoff_days:s.cutoff_days});let l=/^[A-Za-z0-9_-]{43}$/;if(!s.rp_challenge||!l.test(s.rp_challenge))throw new X("Invalid rp_challenge in response: must be 43 base64url characters",se.VALIDATION_ERROR,"INVALID_RP_CHALLENGE");if(!s.submit_secret||!l.test(s.submit_secret))throw new X("Invalid submit_secret in response: must be 43 base64url characters",se.VALIDATION_ERROR,"INVALID_SUBMIT_SECRET");let d={challenge_id:s.challenge_id},g={challenge_id:s.challenge_id,rp_challenge:s.rp_challenge,cutoff_days:s.cutoff_days,verifying_key_id:s.verifying_key_id,submit_secret:s.submit_secret,expires_at:s.expires_at,verify_url:s.verify_url,proof_direction:s.proof_direction},S=JSON.stringify(g),w=vn(new TextEncoder().encode(S)),m=`proviiwallet://verify?d=${encodeURIComponent(w)}`;return{challenge:s,code_verifier:e,qrPayload:d,pollingUrl:s.status_url,deepLink:m}}async function tc(n,e,t,r=mt,i){let o;if(t&&e?o=await Pe(n,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({challengeId:e})},r):o=await Pe(n,{method:"GET",headers:{Accept:"application/json","X-Public-Key":i?.publicKey??""},credentials:"include"},r),o.status===404||o.status===410)return{status:"expired",expires_at:new Date().toISOString()};if(!o.ok)throw new X(`Status check failed (${o.status})`,se.NETWORK_ERROR,`STATUS_HTTP_${o.status}`);return await zt(o)}async function Tr(n,e,t,r=mt){let i,o;t.redeemMode==="rp-proxy"&&t.redeemUrl?(i=t.redeemUrl,o={challenge_id:n,code_verifier:e},console.debug("[AgeGate] Using RP proxy for redemption (recommended pattern):",i)):(i=`${t.challengeUrl.replace(/\/challenge$/,"")}/redeem/${encodeURIComponent(n)}`,o={code_verifier:e},console.debug("[AgeGate] Using direct redemption (demo mode):",i),typeof process<"u");let s=crypto.randomUUID(),l=await Pe(i,{method:"POST",headers:{"Content-Type":"application/json","X-Public-Key":t.publicKey,"Idempotency-Key":s},credentials:"include",redirect:"error",body:JSON.stringify(o)},r);if(!l.ok){if(l.status===409){console.debug("[AgeGate] Challenge already redeemed");return}throw new X(`Redeem failed HTTP ${l.status}`,l.status===410?se.EXPIRED_CHALLENGE:se.NETWORK_ERROR,`REDEEM_HTTP_${l.status}`)}if(console.debug("[AgeGate] Challenge successfully redeemed"),t.redeemMode==="rp-proxy")try{let d=await l.json();console.debug("[AgeGate] RP proxy response:",d)}catch{}}function No(){O.styledQRInstance&&(O.styledQRInstance.destroy(),O.styledQRInstance=null)}var Fo={renderSkeleton:({context:n})=>{try{if(!n.cfg)return;let e=document.getElementById(n.cfg.mountElementId);if(!e)return;let t=Oe(e,n.cfg.cspNonce);Ht(t);let r=document.createElement("div");for(r.innerHTML=`
        <div class="container" lang="en" role="region" aria-label="Age verification">
          <div class="header">
            <div class="logo">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <h2>Age Verification</h2>
            <p>Preparing secure verification...</p>
          </div>
          <div class="content">
            <div class="gate-container agegate-skeleton-gate" aria-busy="true">
              <div class="gate-loading" aria-hidden="true">
                <div class="spinner" aria-hidden="true"></div>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>Powered by <a href="https://provii.app" target="_blank" rel="noopener" aria-label="Provii Wallet (opens in new tab)" class="agegate-footer-link">Provii Wallet</a></p>
            <p class="footer-subtitle">Privacy preserving age verification</p>
          </div>
        </div>
      `;r.firstChild;)t.appendChild(r.firstChild)}catch(e){console.debug("[AgeGate] Skeleton render failed (non-critical):",e)}},renderChallenge:({context:n})=>{try{No();let{cfg:e,challenge:t,deepLink:r,qrPayload:i}=n;if(!e||!t||!r||!i)throw new X("Missing required context",se.MISSING_CONFIG,"MISSING_CONTEXT");let o=document.getElementById(e.mountElementId);if(!o)throw new X(`Mount element not found: ${e.mountElementId}`,se.MOUNT_ERROR,"MOUNT_NOT_FOUND");if(mr()){let l={sessionId:t.session_id||t.challenge_id,statusUrl:e.statusUrl,contentUrl:e.contentUrl,cfg:e,challenge:t};Ya(o,r,i,l)}else Xa(o,i,t,e)}catch(e){console.error("[AgeGate] Failed to render challenge:",e),n.cfg&&Za(n.cfg.mountElementId,e instanceof Error?e:new Error(String(e)),n.cfg.cspNonce)}},redirect:({context:n})=>{try{if(No(),!n.cfg){console.error("[AgeGate] Missing config for redirect");return}Cr(n.cfg.contentUrl)}catch(e){console.error("[AgeGate] Redirect failed:",e)}}},kr={async fetchChallenge(n){if(!n.cfg)throw new X("Configuration missing",se.MISSING_CONFIG,"NO_CONFIG");O.wsManager&&(O.wsManager.close(),O.wsManager=null),O.wsPromise=null,O.wsFailed=!1,O.wsWasConnected=!1;try{let e=await ec(n.cfg),t=e.challenge.session_id||e.challenge.challenge_id;if(t&&e.code_verifier)try{je.storeVerifier(t,e.code_verifier),console.debug("[AgeGate] PKCE verifier stored locally (never shared)")}catch(i){console.warn("[AgeGate] Failed to store PKCE verifier:",i)}let r;if(e.challenge.ws_url)try{Wa(e.challenge.ws_url,n.cfg.challengeUrl),r=e.challenge.ws_url}catch(i){console.warn("[AgeGate] ws_url validation failed, falling back to HTTP polling:",i)}return{challenge:e.challenge,deepLink:e.deepLink,pollingUrl:e.pollingUrl,qrPayload:e.qrPayload,wsUrl:r}}catch(e){throw e instanceof X?e:(console.error("[AgeGate] Unexpected error in fetchChallenge:",e),new X(`Unexpected error: ${e}`,se.NETWORK_ERROR,"FETCH_UNEXPECTED",e))}},async pollStatus(n){if(!n.cfg||!n.challenge)throw new X("Configuration or challenge missing",se.MISSING_CONFIG,"POLL_NO_CONFIG");try{let e=n.challenge,t=e.session_id||e.challenge_id;if(n.wsUrl&&!mr()&&!O.wsFailed&&!O.wsManager)try{O.wsManager=new En(n.wsUrl,t),O.wsPromise=O.wsManager.waitForNotification().then(async s=>{console.debug("[AgeGate] WebSocket push received, redeeming...");let l=je.getVerifier(t);if(!l)throw new Error("PKCE verifier not found after WebSocket notification");if(!n.cfg)throw new Error("Configuration not available for challenge redemption");return await Tr(t,l,n.cfg,mt),je.clearVerifier(t),{isValid:!0,message:"verified",source:"websocket"}}).catch(s=>(console.debug("[AgeGate] WebSocket failed, using HTTP polling:",s?.message),O.wsFailed=!0,O.wsManager?.wasConnected&&(O.wsWasConnected=!0),O.wsManager&&(O.wsManager.close(),O.wsManager=null),null))}catch{O.wsFailed=!0,O.wsManager=null,O.wsPromise=null}if(O.wsPromise){let s=await Promise.race([O.wsPromise,new Promise(l=>setTimeout(()=>l(null),0))]);if(s&&typeof s=="object"&&"isValid"in s&&s.isValid)return O.wsManager?.close(),O.wsManager=null,O.wsPromise=null,s}if(O.wsManager&&!O.wsFailed&&O.wsPromise){let s=await O.wsPromise;if(s&&typeof s=="object"&&"isValid"in s&&s.isValid)return O.wsManager?.close(),O.wsManager=null,O.wsPromise=null,s}let r,i=!1;n.cfg.redeemMode==="rp-proxy"&&n.cfg.pollUrl?(r=n.cfg.pollUrl,i=!0):r=n.pollingUrl||n.cfg.statusUrl.replace("{sid}",encodeURIComponent(t));let o=await tc(r,t,i,mt,n.cfg);if(o.status==="proof_ok_waiting_for_redeem"){console.debug("[AgeGate] Proof verified (via HTTP poll), calling redeem..."),O.wsManager&&(O.wsManager.close(),O.wsManager=null,O.wsPromise=null);let s=je.getVerifier(t);if(!s)throw new X("PKCE verifier not found - this is expected if user cleared storage",se.VALIDATION_ERROR,"MISSING_PKCE_VERIFIER");return await Tr(t,s,n.cfg,mt),je.clearVerifier(t),console.debug("[AgeGate] PKCE verifier cleared after redemption"),{isValid:!0,message:"verified"}}return o.status==="verified"?(O.wsManager&&(O.wsManager.close(),O.wsManager=null,O.wsPromise=null),{isValid:!0,message:"verified"}):o.status==="failed"||o.status==="expired"?(O.wsManager&&(O.wsManager.close(),O.wsManager=null,O.wsPromise=null),{isValid:!1,message:o.status,state:o.status}):{isValid:!1,message:"pending",state:"pending"}}catch(e){throw e instanceof X?e:(console.error("[AgeGate] Unexpected error in pollStatus:",e),new X(`Unexpected error: ${e}`,se.NETWORK_ERROR,"POLL_UNEXPECTED",e))}}};var ae={EARLY_PHASE_DURATION:15e3,EARLY_INTERVAL:5e3,MID_PHASE_DURATION:45e3,MID_INTERVAL:4e3,LATE_INTERVAL:3e3,PROOF_DETECTED_INTERVAL:1500,WS_FALLBACK_INTERVAL:1e3,MAX_NETWORK_RETRIES:5,MAX_NEGATIVE_RETRIES:3,MAX_TOTAL_ATTEMPTS:60,JITTER_FACTOR:.15,BACKOFF_FACTOR:1.5,MAX_INTERVAL:15e3};function Gt(n,e,t){return e==="proof_ok"||e==="proof_ok_waiting_for_redeem"?ae.PROOF_DETECTED_INTERVAL:t?ae.WS_FALLBACK_INTERVAL:n<ae.EARLY_PHASE_DURATION?ae.EARLY_INTERVAL:n<ae.MID_PHASE_DURATION?ae.MID_INTERVAL:ae.LATE_INTERVAL}function Ke(n){let e=n*ae.JITTER_FACTOR;return Math.round(n+(Math.random()*e*2-e))}var Mr=bi({types:{},id:"ageGate",initial:"idle",context:{},states:{idle:{on:{FETCH:{target:"fetching",actions:oe(({event:n})=>({cfg:n.cfg,currentPollInterval:ae.EARLY_INTERVAL,networkRetries:0,negativeRetries:0,totalAttempts:0,pollingStartTime:Date.now(),error:void 0,userMessage:void 0,isFirstPoll:!0}))}}},fetching:{entry:"renderSkeleton",invoke:{src:"fetchChallenge",input:({context:n})=>({context:n}),onDone:{target:"rendered",actions:oe({challenge:({event:n})=>n.output.challenge,deepLink:({event:n})=>n.output.deepLink,pollingUrl:({event:n})=>n.output.pollingUrl,qrPayload:({event:n})=>n.output.qrPayload,wsUrl:({event:n})=>n.output.wsUrl})},onError:{target:"failed",actions:oe({error:({event:n})=>n.error,lastErrorType:()=>"fatal",userMessage:()=>"Unable to connect to the verification service. Please check your internet connection and refresh the page to try again."})}}},rendered:{entry:"renderChallenge",always:"waiting"},polling:{entry:oe({totalAttempts:({context:n})=>(n.totalAttempts??0)+1,isFirstPoll:()=>!1}),invoke:{src:"pollStatus",input:({context:n})=>({context:n}),onDone:[{target:"verified",guard:({event:n})=>n.output.isValid===!0},{target:"failed",guard:({event:n})=>{let e=n.output;return e.state==="expired"||e.message==="expired"},actions:oe({error:()=>new Error("Verification challenge has expired"),lastErrorType:()=>"fatal",lastPollState:({event:n})=>n.output.state||"expired",userMessage:()=>"Your verification session expired after 5 minutes. Please refresh the page to start a new verification."})},{target:"failed",guard:({event:n})=>{let e=n.output;return e.state==="failed"||e.message==="failed"},actions:oe({error:()=>new Error("Verification failed"),lastErrorType:()=>"fatal",lastPollState:({event:n})=>n.output.state||"failed",userMessage:()=>"Verification was not completed. Please ensure Provii Wallet is open and that you approved the age check request, then try again. If the problem persists, visit provii.app/help for assistance."})},{target:"waiting",guard:({event:n})=>n.output.message==="pending",actions:oe({networkRetries:()=>0,lastPollState:({event:n})=>n.output.state||"pending",currentPollInterval:({context:n,event:e})=>{let t=Date.now()-(n.pollingStartTime??Date.now()),r=e.output.state||"pending",i=Gt(t,r,yt());return Ke(i)}})},{target:"timeout",guard:({context:n})=>(n.totalAttempts??0)>=ae.MAX_TOTAL_ATTEMPTS,actions:oe({error:()=>new Error("Verification timed out"),lastErrorType:()=>"timeout",userMessage:()=>"Your verification session expired after 5 minutes. Your previous session has been discarded. Please refresh the page to generate a new QR code and start again."})},{target:"failed",guard:({context:n})=>(n.negativeRetries??0)>=ae.MAX_NEGATIVE_RETRIES,actions:oe({error:()=>new Error("Verification rejected after multiple attempts"),lastErrorType:()=>"negative",userMessage:()=>"Verification could not be completed after several attempts. Please ensure Provii Wallet is open and that you have completed the age check in the app, then try again."})},{target:"waiting",actions:oe({negativeRetries:({context:n})=>(n.negativeRetries??0)+1,lastErrorType:()=>"negative",currentPollInterval:({context:n})=>{let e=Date.now()-(n.pollingStartTime??Date.now()),t=Gt(e,n.lastPollState,yt());return Ke(t)}})}],onError:[{target:"timeout",guard:({context:n})=>(n.networkRetries??0)>=ae.MAX_NETWORK_RETRIES,actions:oe({error:({event:n})=>n.error,lastErrorType:()=>"timeout",userMessage:()=>"The verification service could not be reached after multiple attempts. This may be caused by an unstable internet connection or a temporary service disruption. Please check your connection, wait a moment, and refresh the page to try again."})},{target:"waiting",actions:oe({networkRetries:({context:n})=>(n.networkRetries??0)+1,lastErrorType:()=>"network",currentPollInterval:({context:n})=>{let e=n.currentPollInterval??ae.LATE_INTERVAL,t=Math.floor(e*ae.BACKOFF_FACTOR),r=Math.min(t,ae.MAX_INTERVAL);return Ke(r)}})}]},on:{USER_RETRY:{target:"polling",actions:oe({networkRetries:()=>0,negativeRetries:()=>0,currentPollInterval:({context:n})=>{let e=Date.now()-(n.pollingStartTime??Date.now()),t=Gt(e,n.lastPollState,yt());return Ke(t)}})}}},waiting:{entry:oe({currentPollInterval:({context:n})=>{if(n.lastErrorType==="network"){let r=n.currentPollInterval??ae.LATE_INTERVAL,i=Math.floor(r*ae.BACKOFF_FACTOR);return Math.min(i,ae.MAX_INTERVAL)}let e=Date.now()-(n.pollingStartTime??Date.now()),t=Gt(e,n.lastPollState,yt());return Ke(t)}}),after:{POLL_INTERVAL:"polling"},on:{USER_RETRY:{target:"polling",actions:oe({networkRetries:()=>0,negativeRetries:()=>0,currentPollInterval:({context:n})=>{let e=Date.now()-(n.pollingStartTime??Date.now()),t=Gt(e,n.lastPollState,yt());return Ke(t)}})}}},timeout:{entry:["notifyTimeout"],on:{USER_RETRY:{target:"fetching",actions:oe({networkRetries:()=>0,negativeRetries:()=>0,totalAttempts:()=>0,pollingStartTime:()=>Date.now(),currentPollInterval:()=>Ke(ae.EARLY_INTERVAL),lastPollState:()=>{},error:()=>{},userMessage:()=>{},isFirstPoll:()=>!0})}}},verified:{entry:"redirect",type:"final"},failed:{entry:["notifyFailure"],on:{USER_RETRY:{target:"fetching",actions:oe({networkRetries:()=>0,negativeRetries:()=>0,totalAttempts:()=>0,pollingStartTime:()=>Date.now(),currentPollInterval:()=>Ke(ae.EARLY_INTERVAL),lastPollState:()=>{},error:()=>{},userMessage:()=>{},isFirstPoll:()=>!0})}}}}},{delays:{POLL_INTERVAL:({context:n})=>n.currentPollInterval??ae.EARLY_INTERVAL}});var nc={production:"https://hosted.provii.app/v1/hosted",sandbox:"https://sandbox-hosted.provii.app/v1/hosted"},rc={fetchChallenge:nn(async({input:n})=>kr.fetchChallenge(n.context)),pollStatus:nn(async({input:n})=>kr.pollStatus(n.context))},jt=class{cfg;redirectFn;actor;initPromise;disposed=!1;cleanupCallbacks=[];visibilityTimeout;darkModeQuery;constructor(e,t=r=>{typeof window<"u"&&(window.location.href=r)}){this.cfg=e instanceof Mt?e:new Mt(e),this.redirectFn=t,Do();let r=Bo();this.cleanupCallbacks.push(r);let i=Mr.provide({actors:rc,actions:{...Fo,redirect:({context:o})=>{o.cfg?this.redirectFn(o.cfg.contentUrl):console.error("[AgeGate] redirect called without cfg")},notifyTimeout:({context:o})=>{this.showRetryPrompt(o.userMessage||"Your verification session expired after 5 minutes. Your previous session has been discarded. Please refresh the page to start a new verification.","timeout")},notifyFailure:({context:o})=>{this.showRetryPrompt(o.userMessage||"Verification could not be completed. Please ensure you have Provii Wallet installed and open, then refresh this page to try again. If the problem continues, visit provii.app/help for assistance.","error")}}});this.actor=ke(i).start(),this.applyTheme(),this.setupAutoCleanup()}applyTheme(){if(typeof document>"u")return;let e=document.getElementById(this.cfg.mountElementId);if(!e)return;let t=this.cfg.theme;if(t==="light"||t==="dark"){e.setAttribute("data-agegate-theme",t);return}if(typeof window<"u"&&window.matchMedia){this.darkModeQuery=window.matchMedia("(prefers-color-scheme: dark)");let r=o=>{e&&e.setAttribute("data-agegate-theme",o?"dark":"light")};r(this.darkModeQuery.matches);let i=o=>{r(o.matches)};this.darkModeQuery.addEventListener("change",i),this.cleanupCallbacks.push(()=>{this.darkModeQuery?.removeEventListener("change",i)})}}setupAutoCleanup(){if(typeof window<"u"){let e=()=>{this.dispose()};window.addEventListener("beforeunload",e),window.addEventListener("pagehide",e),this.cleanupCallbacks.push(()=>{window.removeEventListener("beforeunload",e),window.removeEventListener("pagehide",e)});let t=window;if(t.navigation){let i=()=>{this.dispose()};try{t.navigation.addEventListener("navigate",i),this.cleanupCallbacks.push(()=>{try{t.navigation?.removeEventListener("navigate",i)}catch{}})}catch{console.debug("[AgeGate] Navigation API not available")}}let r=()=>{console.debug("[AgeGate] History navigation detected, disposing"),this.dispose()};window.addEventListener("popstate",r),this.cleanupCallbacks.push(()=>{window.removeEventListener("popstate",r)})}if(typeof document<"u"){let e=0,t=()=>{document.hidden?(e=Date.now(),this.visibilityTimeout=setTimeout(()=>{console.debug("[AgeGate] Disposing after 5 minutes in background"),this.showRetryPrompt("Your verification session expired because this page was in the background for more than 5 minutes. Any verification in progress has been lost. Please refresh the page to start a new verification.","timeout"),this.dispose()},300*1e3)):(this.visibilityTimeout&&(clearTimeout(this.visibilityTimeout),this.visibilityTimeout=void 0),e&&Date.now()-e>3e5&&console.debug("[AgeGate] Page was hidden for too long, consider refreshing"))};document.addEventListener("visibilitychange",t),this.cleanupCallbacks.push(()=>{document.removeEventListener("visibilitychange",t),this.visibilityTimeout&&clearTimeout(this.visibilityTimeout)})}}showRetryPrompt(e,t="error"){let r=this.cfg?document.getElementById(this.cfg.mountElementId):null;if(!r){console.error("[AgeGate] Mount element not found for retry prompt");return}let i=Oe(r,this.cfg.cspNonce),o=Array.from(i.childNodes);for(let m of o)m instanceof HTMLStyleElement||i.removeChild(m);let s=t==="timeout"?"agegate-icon-timeout":"agegate-icon-error",l=t==="timeout"?'<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>':'<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>',d=document.createElement("div");for(d.innerHTML=`
      <div role="alert" lang="en" class="agegate-retry-alert">
        <svg aria-hidden="true" class="agegate-retry-icon ${s}" viewBox="0 0 20 20" fill="currentColor">
          ${l}
        </svg>

        <h2 class="agegate-retry-heading">${t==="timeout"?"Verification Timed Out":"Verification Failed"}</h2>

        <p class="agegate-retry-message" id="agegate-retry-msg"></p>

        <button id="agegate-retry-btn" class="agegate-retry-button">
          Try Again
        </button>

        ${t==="timeout"?`
          <p class="agegate-retry-hint">Make sure Provii Wallet is open and ready</p>
        `:""}
        <p class="agegate-retry-help-container"><a href="https://provii.app/help" target="_blank" rel="noopener" aria-label="Need help with age verification? (opens in new tab)" class="agegate-retry-help-link">Need help?</a></p>
      </div>`;d.firstChild;)i.appendChild(d.firstChild);let g=i.querySelector("#agegate-retry-msg");g&&(g.textContent=e),this.injectRetryStyles(i);let S=i.querySelector('[role="alert"]');S&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches&&(S.style.animation="fadeIn 0.3s ease-in");let w=i.querySelector("#agegate-retry-btn");w instanceof HTMLElement&&(w.addEventListener("click",()=>{this.userRetry()}),w.focus())}injectRetryStyles(e){let t="agegate-retry-styles";if(e.querySelector(`#${t}`))return;let r=document.createElement("style");r.id=t,this.cfg.cspNonce&&r.setAttribute("nonce",this.cfg.cspNonce),r.textContent=`
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        @keyframes fadeIn {
          from { opacity: 1; transform: none; }
          to { opacity: 1; transform: none; }
        }
      }
      .agegate-retry-alert {
        text-align: center;
        padding: 32px 20px;
        max-width: 400px;
        margin: 0 auto;
      }
      .agegate-retry-icon {
        width: 56px;
        height: 56px;
        margin: 0 auto 20px;
        display: block;
      }
      .agegate-icon-timeout { color: var(--ag-warning, #D97706); }
      .agegate-icon-error { color: var(--ag-error, #C62020); }
      .agegate-retry-heading {
        margin: 0 0 12px;
        color: var(--ag-text, #1F2937);
        font-size: 1.125rem;
        font-weight: 700;
      }
      .agegate-retry-message {
        margin: 0 0 24px;
        color: var(--ag-text-secondary, #6B7280);
        font-size: 0.9375rem;
        line-height: 1.5;
      }
      .agegate-retry-button {
        background: var(--ag-accent-gradient, linear-gradient(135deg, #007AA8 0%, #8B3FD9 100%));
        border: none;
        color: #fff;
        padding: 12px 32px;
        min-height: 44px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 700;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .agegate-retry-hint {
        margin: 16px 0 0;
        color: var(--ag-text-muted, #6B7280);
        font-size: 0.8125rem;
      }
      .agegate-retry-help-container {
        margin: 16px 0 0;
        font-size: 0.8125rem;
        text-align: center;
      }
      .agegate-retry-help-link {
        color: var(--ag-accent-start, #007AA8);
        display: inline-block;
        padding: 12px 8px;
        min-height: 44px;
      }
      #agegate-retry-btn:focus-visible {
        outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #007AA8));
        outline-offset: 2px;
        box-shadow: var(--ag-focus-ring, 0 0 0 3px rgba(0, 122, 168, 0.4));
      }
      [role="alert"] a:focus-visible {
        outline: 2px solid var(--ag-focus-outline, var(--ag-accent-start, #007AA8));
        outline-offset: 2px;
        border-radius: 2px;
      }
    `,e.appendChild(r)}userRetry(){console.debug("[AgeGate] User initiated retry - reloading page for fresh start"),window.location.reload()}async checkExistingSession(){let t=`${nc[this.cfg.environment]}/session/check`;console.debug("[AgeGate] Checking for existing session at:",t);try{let r=await Pe(t,{method:"GET",headers:{"X-Public-Key":this.cfg.publicKey,Accept:"application/json"},credentials:"include"},1e4);if(!r.ok)return console.debug("[AgeGate] Session check returned non-OK status:",r.status),{verified:!1};let i=await zt(r);return console.debug("[AgeGate] Session check result:",{verified:i.verified}),i}catch(r){return console.debug("[AgeGate] Session check failed (proceeding with verification):",r),{verified:!1}}}init(){return this.disposed?Promise.reject(new Error("AgeGate instance has been disposed")):this.initPromise?this.initPromise:(this.initPromise=(async()=>{let e=new Promise((r,i)=>{let o=!1,s=this.actor.subscribe(l=>{if(!o&&l.matches("rendered"))o=!0,s.unsubscribe(),r();else if(!o&&l.matches("failed")){o=!0,s.unsubscribe();let d=l.context.error??new Error("Age gate initialization failed");i(d)}});this.actor.send({type:"FETCH",cfg:this.cfg}),setTimeout(()=>{o||(o=!0,s.unsubscribe(),i(new Error("Age gate initialization timed out")))},33e4)}),t;if(this.cfg.redeemMode==="rp-proxy"?t={verified:!1}:t=await Promise.race([this.checkExistingSession(),new Promise(r=>setTimeout(()=>r({verified:!1}),3e3))]),t.verified){console.log("[AgeGate] User already has valid session, redirecting to content"),this.redirectFn(this.cfg.contentUrl);return}return console.debug("[AgeGate] No valid session, waiting for verification flow"),e})(),this.initPromise)}getState(){if(this.disposed)return"disposed";let e=this.actor.getSnapshot();return e.matches("idle")?"idle":e.matches("fetching")?"fetching":e.matches("rendered")?"rendered":e.matches("polling")?"polling":e.matches("waiting")?"waiting":e.matches("timeout")?"timeout":e.matches("verified")?"verified":e.matches("failed")?"failed":"unknown"}getContext(){if(this.disposed)return{error:new Error("Instance disposed"),userMessage:"Your verification session expired because this page was inactive for more than 5 minutes. Any verification in progress has been lost. Please refresh the page to start a new verification."};let t=this.actor.getSnapshot().context;return{currentPollInterval:t.currentPollInterval,networkRetries:t.networkRetries,negativeRetries:t.negativeRetries,totalAttempts:t.totalAttempts,lastErrorType:t.lastErrorType,lastPollState:t.lastPollState,error:t.error,userMessage:t.userMessage}}retry(){this.userRetry()}stop(){this.dispose()}dispose(){if(!this.disposed){console.debug("[AgeGate] Disposing instance"),this.disposed=!0;try{this.actor.stop()}catch(e){console.error("[AgeGate] Error stopping actor:",e)}this.visibilityTimeout&&(clearTimeout(this.visibilityTimeout),this.visibilityTimeout=void 0),this.cleanupCallbacks.forEach(e=>{try{e()}catch(t){console.error("[AgeGate] Cleanup error:",t)}}),this.cleanupCallbacks=[],console.debug("[AgeGate] Instance disposed successfully")}}isDisposed(){return this.disposed}subscribe(e){if(this.disposed)return console.warn("[AgeGate] Cannot subscribe - instance disposed"),()=>{};let t=this.actor.subscribe(r=>{this.disposed||e(this.getState(),this.getContext())});return()=>{try{t.unsubscribe()}catch{}}}};var qo={parse:n=>{if(!n||typeof n!="object")throw new Error("Invalid challenge: not an object");let e=n;if(typeof e.challenge_id!="string")throw new Error("Invalid challenge_id");if(typeof e.short_code!="string")throw new Error("Invalid short_code");if(typeof e.rp_challenge!="string")throw new Error("Invalid rp_challenge");if(typeof e.cutoff_days!="number")throw new Error("Invalid cutoff_days");if(typeof e.verifying_key_id!="number")throw new Error("Invalid verifying_key_id");if(typeof e.submit_secret!="string")throw new Error("Invalid submit_secret");if(typeof e.expires_at!="number")throw new Error("Invalid expires_at");if(typeof e.status_url!="string")throw new Error("Invalid status_url");if(typeof e.verify_url!="string")throw new Error("Invalid verify_url");return n}},zo={parse:n=>{if(!n||typeof n!="object")throw new Error("Invalid status: not an object");if(typeof n.status!="string")throw new Error("Invalid status field");return n}};var tt=n=>n?`${n.substring(0,8)}...`:"none";function ic(n){if(!(!n||n==="NONE"))return n==="EXPIRED"?"Session expired":n==="BANNED"?"Access denied":"Verification failed"}var oc={parse:n=>{if(!n||typeof n!="object")throw new Error("Invalid redeem response: not an object");if(typeof n.status!="string")throw new Error("Invalid redeem response: missing status");return n}},sc={parse:n=>{if(!n||typeof n!="object")throw new Error("Invalid session check response: not an object");let e=n;if(typeof e.verified!="boolean")throw new Error("Invalid session check response: missing verified");if(e.session!==void 0&&e.session!==null){if(typeof e.session!="object")throw new Error("Invalid session check response: session must be an object");let t=e.session;if(typeof t.sessionId!="string")throw new Error("Invalid session check response: missing session.sessionId");if(typeof t.expiresAt!="number")throw new Error("Invalid session check response: missing session.expiresAt")}return n}},Ce=class extends Error{statusCode;code;details;retryAfterMs;constructor(e,t,r,i,o){super(e),this.statusCode=t,this.code=r,this.details=i,this.name="ApiError",this.retryAfterMs=o}isRateLimitError(){return this.statusCode===429}isTimeoutError(){return this.code==="TIMEOUT"}isRetryable(){return this.statusCode>=500||this.code==="TIMEOUT"||this.code==="NETWORK_ERROR"}},In=class{config;retryConfig;fetchImpl;constructor(e){let t=e.environment||xn.environment||"production",r=e.apiEndpoint||_r[t];this.config={publicKey:e.publicKey,environment:t,apiEndpoint:r,timeout:e.timeout??xn.timeout??1e4,debug:e.debug??xn.debug??!1,fetchImpl:e.fetchImpl??globalThis.fetch.bind(globalThis)},this.retryConfig=Mo,this.fetchImpl=e.fetchImpl||globalThis.fetch.bind(globalThis),this.log("Client initialised",{environment:this.config.environment,apiEndpoint:this.config.apiEndpoint})}async createChallenge(e){this.log("Creating challenge");let t=`${this.config.apiEndpoint}/v1/hosted/challenge`,r={public_key:this.config.publicKey,origin:e.origin,code_challenge:e.codeChallenge,code_challenge_method:e.codeChallengeMethod,metadata:e.metadata},i=crypto.randomUUID(),o=await this.request(t,{method:"POST",headers:{"Content-Type":"application/json","X-Public-Key":this.config.publicKey,"Idempotency-Key":i,Origin:e.origin},body:JSON.stringify(r)},0,qo);this.log("Challenge created",{sessionId:tt(o.challenge_id)});let s={challenge_id:o.challenge_id,rp_challenge:o.rp_challenge,cutoff_days:o.cutoff_days,verifying_key_id:o.verifying_key_id,submit_secret:o.submit_secret,expires_at:o.expires_at,verify_url:o.verify_url,proof_direction:o.proof_direction},l=vn(new TextEncoder().encode(JSON.stringify(s))),d=`proviiwallet://verify?d=${encodeURIComponent(l)}`;return{sessionId:o.session_id??o.challenge_id,challengeId:o.challenge_id,qrCodeUrl:o.qr_code_url,challengeCode:o.short_code,expiresAt:o.expires_at,deepLink:d,status:"pending"}}async pollStatus(e){this.log("Polling status",{sessionId:tt(e)});let t=`${this.config.apiEndpoint}/v1/hosted/status/${encodeURIComponent(e)}`,r=window.location.origin,i=await this.request(t,{method:"GET",headers:{"X-Public-Key":this.config.publicKey,Origin:r}},0,zo),s={verified:"verified",proof_ok_waiting_for_redeem:"proof_ok",failed:"failed",expired:"expired"}[i.status]??"pending",l=i.status==="verified";return this.log("Status received",{sessionId:tt(e),state:s,complete:l}),{sessionId:e,state:s,complete:l,createdAt:0,expiresAt:new Date(i.expires_at).getTime()/1e3,proofVerified:i.status==="proof_ok_waiting_for_redeem"||i.status==="verified",pollAfter:0,remainingChecks:0,error:ic(i.reason)}}async redeemSession(e,t){this.log("Redeeming session",{sessionId:tt(e)});let r=`${this.config.apiEndpoint}/v1/hosted/redeem/${encodeURIComponent(e)}`,i=window.location.origin,o=crypto.randomUUID(),s=await this.request(r,{method:"POST",headers:{"Content-Type":"application/json","X-Public-Key":this.config.publicKey,"Idempotency-Key":o,Origin:i},body:JSON.stringify({code_verifier:t}),credentials:"include"},0,oc);return this.log("Session redeemed",{sessionId:tt(e)}),{status:s.status,verifiedAt:Date.now()/1e3,expiresAt:0}}async checkSession(){this.log("Checking session");let e=`${this.config.apiEndpoint}/v1/hosted/session/check`,t=window.location.origin,r=await this.request(e,{method:"GET",headers:{"X-Public-Key":this.config.publicKey,Origin:t},credentials:"include"},0,sc);return this.log("Session check complete",{verified:r.verified}),r}async request(e,t,r=0,i){try{let o=new AbortController,s=setTimeout(()=>o.abort(),this.config.timeout);try{let l=await this.fetchImpl(e,{...t,signal:o.signal});clearTimeout(s),l.ok||await this.handleErrorResponse(l,e,t,r,i);let d=await l.json();if(i)try{return i.parse(d)}catch(g){throw this.log("Response validation failed",{url:e,error:g}),new Ce("Invalid server response",0,"VALIDATION_ERROR")}throw new Ce("No response validator provided",0,"MISSING_VALIDATOR")}finally{clearTimeout(s)}}catch(o){if(o instanceof Error&&o.name==="AbortError")throw this.log("Request timeout",{url:e}),new Ce("Request timeout",0,"TIMEOUT");if(o instanceof TypeError){if(this.log("Network error",{url:e,error:o.message}),r<this.retryConfig.maxRetries)return this.retryRequest(e,t,r+1,i);throw new Ce("Network error",0,"NETWORK_ERROR")}throw o instanceof Ce?o:(this.log("Unknown error",{url:e,error:o}),new Ce("An unexpected error occurred",0,"UNKNOWN_ERROR"))}}getClientSafeMessage(e){return e===400?"Invalid request":e===401?"Authentication required":e===403?"Access denied":e===404?"Not found":e===409?"Request conflict":e===429?"Too many requests":e>=500?"Service temporarily unavailable":"Request failed"}async handleErrorResponse(e,t,r,i,o){let s=e.status,l=null;try{l=await e.json()}catch{}let d=l?.code;this.log("API error",{url:t,statusCode:s,serverMessage:l?.error,serverDetails:l?.details,code:d});let g;if(s===429){let m=e.headers.get("Retry-After");if(m){let _=parseInt(m,10);!isNaN(_)&&_>0&&_<=300&&(g=_*1e3)}}let S=this.getClientSafeMessage(s),w=new Ce(S,s,d,void 0,g);if(w.isRetryable()&&i<this.retryConfig.maxRetries)return this.retryRequest(t,r,i+1,o);throw w}async retryRequest(e,t,r,i){let o=Math.min(this.retryConfig.initialDelay*Math.pow(this.retryConfig.backoffMultiplier,r-1),this.retryConfig.maxDelay);return this.log("Retrying request",{url:e,retryCount:r,delay:o}),await this.sleep(o),this.request(e,t,r,i)}sleep(e){return new Promise(t=>setTimeout(t,e))}log(e,t){this.config.debug&&console.debug(`[HostedBackendClient] ${e}`,t||"")}};var wt=class extends Error{constructor(e){super(e),this.name="SessionError"}},Cn=class{debug;cookieName;constructor(e="production",t=!1){this.debug=t,this.cookieName=Po[e]}hasSession(){let e=this.getSession();return e?!this.isExpired(e):!1}getSession(){this.log("Getting session");let e=this.getCookie(this.cookieName);if(!e)return this.log("No session cookie found (expected with HttpOnly cookies)"),null;try{let t=this.parseJWT(e);return this.log("Session parsed",{sessionId:t.sessionId,expiresAt:new Date(t.expiresAt*1e3).toISOString()}),t}catch(t){return this.log("Failed to parse session",{error:t}),null}}isExpired(e){let t=e||this.getSession();if(!t)return!0;let r=Math.floor(Date.now()/1e3),i=r>=t.expiresAt;return this.log("Session expiration check",{expired:i,expiresAt:new Date(t.expiresAt*1e3).toISOString(),now:new Date(r*1e3).toISOString()}),i}clearSession(){this.log("Clearing session (will not work for HttpOnly cookies)"),this.deleteCookie(this.cookieName)}parseJWT(e){let t=e.split(".");if(t.length!==3)throw new wt("Invalid JWT format");let r=t[1];if(!r)throw new wt("Missing JWT payload");let i=this.base64UrlDecode(r),o;try{o=JSON.parse(i)}catch{throw new wt("Invalid JWT payload JSON")}if(!this.isValidClaims(o))throw new wt("Invalid JWT claims");return{sessionId:o.sub,origin:o.origin,issuedAt:o.iat,expiresAt:o.exp,issuer:o.iss}}isValidClaims(e){if(typeof e!="object"||e===null)return!1;let t=e;return typeof t.sub=="string"&&typeof t.origin=="string"&&typeof t.iat=="number"&&typeof t.exp=="number"&&typeof t.iss=="string"}base64UrlDecode(e){let t=e.replace(/-/g,"+").replace(/_/g,"/"),r=t.length%4;return r&&(t+="=".repeat(4-r)),globalThis.atob(t)}getCookie(e){if(typeof document>"u")return null;let t=document.cookie.split(";");for(let r of t){let[i,o]=r.trim().split("=");if(i===e&&o)return decodeURIComponent(o)}return null}deleteCookie(e){typeof document>"u"||(document.cookie=`${e}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`)}log(e,t){this.debug&&console.debug(`[SessionManager] ${e}`,t||"")}};var Pr="provii_session_cache";var Se=class{static isValid(){let e=this.get();return e?Date.now()>e.expiresAt*1e3?(this.clear(),!1):typeof window<"u"&&e.origin!==window.location.origin?(this.clear(),!1):!0:!1}static set(e){try{let t={version:1,...e,cachedAt:Date.now()};localStorage.setItem(Pr,JSON.stringify(t)),console.debug("[SessionCache] Session cached")}catch(t){console.warn("[SessionCache] Failed to cache session:",t)}}static get(){try{let e=localStorage.getItem(Pr);if(!e)return null;let t=JSON.parse(e);return t.version!==1?(this.clear(),null):t}catch{return null}}static clear(){try{localStorage.removeItem(Pr),console.debug("[SessionCache] Cache cleared")}catch{}}static getRemainingTime(){let e=this.get();return e?Math.max(0,e.expiresAt-Math.floor(Date.now()/1e3)):0}};var we=class extends Error{constructor(e){super(e),this.name="ConfigError"}};function Ho(n){let e=n.dataset.publicKey||"",t=n.dataset.environment,r=n.dataset.style,i=n.dataset.apiEndpoint,o=n.dataset.allowClose,s=n.dataset.debug,l=n.dataset.customStyles,d=n.dataset.cspNonce;if(t!==void 0&&!dc(t))throw new we('data-environment must be "production" or "sandbox"');let g=t;if(r!==void 0&&!uc(r))throw new we('data-style must be "modern", "minimal", or "custom"');let w={publicKey:e,environment:g||"production",style:r||"modern",apiEndpoint:i,allowClose:Vo(o),debug:Vo(s),customStyles:l,cspNonce:d};return ac(w),w}function ac(n){if(!n.publicKey||n.publicKey.trim()==="")throw new we("data-public-key is required");if(!lc(n.publicKey))throw new we("data-public-key must be in format pk_live_xxx or pk_test_xxx (64 hex chars)");if(n.environment&&!["production","sandbox"].includes(n.environment))throw new we('data-environment must be "production" or "sandbox"');if(n.style&&!["modern","minimal","custom"].includes(n.style))throw new we('data-style must be "modern", "minimal", or "custom"');if(n.apiEndpoint&&!hc(n.apiEndpoint))throw new we("data-api-endpoint must be a valid HTTPS URL");if(n.apiEndpoint){let e=["hosted.provii.app","sandbox-hosted.provii.app"];try{let t=new URL(n.apiEndpoint);if(!e.includes(t.hostname))throw new we(`data-api-endpoint domain "${t.hostname}" is not a recognised Provii API endpoint. Allowed domains: ${e.join(", ")}`)}catch(t){throw t instanceof we?t:new we("data-api-endpoint must be a valid HTTPS URL")}}if(n.style==="custom"&&!n.customStyles)throw new we('data-custom-styles is required when style="custom"')}function Go(){if(typeof document>"u")return null;let n=document.currentScript;if(n&&n.dataset.publicKey)return n;let e=document.querySelectorAll("script[data-public-key]");return e.length===0?null:(e.length>1&&console.warn("[Provii Age Gate] Multiple script tags found with data-public-key. Using first one."),e[0]||null)}function Vo(n){if(!n)return!1;let e=n.toLowerCase().trim();return["true","1","yes","on"].includes(e)}var cc=/^pk_(live|test)_[a-f0-9]{64}$/;function lc(n){return cc.test(n)}function dc(n){return n==="production"||n==="sandbox"}function uc(n){return n==="modern"||n==="minimal"||n==="custom"}function hc(n){try{return new URL(n).protocol==="https:"}catch{return!1}}var Or="Session expired",Tn=".provii-overlay-content",Rn=class{config;apiClient;pkceManager;sessionManager;eventHandlers;overlayElement=null;shadowHost=null;shadowRoot=null;pollingIntervalId=null;currentChallenge=null;pollingStartTime=0;currentPollingInterval=gt.initialInterval;previousFocus=null;consecutivePollingErrors=0;constructor(e){this.config=e,this.apiClient=new In({publicKey:e.publicKey,environment:e.environment,apiEndpoint:e.apiEndpoint,debug:e.debug}),this.pkceManager=new pt(e.debug),this.sessionManager=new Cn(e.environment,e.debug),this.eventHandlers=new Map,this.log("Auto-block mode initialised",{config:e})}async initialise(){this.log("Initialising");try{await this.checkAndBlock()}catch(e){this.handleError("initialization_failed",e)}}async checkAndBlock(){if(this.log("Checking for existing session"),Se.isValid()){this.log("Valid session cache found, skipping API check"),this.backgroundRevalidate().catch(e=>{this.log("Background revalidation failed",{error:e})});return}if(this.sessionManager.hasSession()){this.log("Valid session cookie found, allowing access");let e=this.sessionManager.getSession();e&&Se.set({sessionId:e.sessionId,verifiedAt:e.issuedAt,expiresAt:e.expiresAt,origin:e.origin});return}this.log("No valid session, blocking access"),Se.clear(),await this.blockAndVerify()}async backgroundRevalidate(){this.log("Starting background revalidation");try{if(!this.sessionManager.hasSession()){this.log("Background revalidation: No session cookie found, clearing cache"),Se.clear();return}let e=this.sessionManager.getSession(),t=Se.get();if(!e||!t){Se.clear();return}if(e.sessionId!==t.sessionId){this.log("Background revalidation: Session mismatch, clearing cache"),Se.clear();return}this.log("Background revalidation: Session valid")}catch(e){this.log("Background revalidation error",{error:e})}}async blockAndVerify(){try{this.showOverlay("Initializing age verification..."),this.log("Generating PKCE challenge");let e=await this.pkceManager.generateChallenge();this.log("Creating verification challenge");let t=await this.apiClient.createChallenge({codeChallenge:e.challenge,codeChallengeMethod:"S256",origin:window.location.origin});this.currentChallenge=t,this.pkceManager.storeVerifier(t.sessionId,e.verifier),this.updateOverlayWithChallenge(t),this.startPolling(t.sessionId)}catch(e){this.handleError("verification_failed",e)}}startPolling(e){this.log("Starting status polling",{sessionId:tt(e)}),this.pollingStartTime=Date.now(),this.currentPollingInterval=gt.initialInterval,this.consecutivePollingErrors=0,this.pollStatus(e),this.pollingIntervalId=window.setInterval(()=>{this.pollStatus(e)},this.currentPollingInterval)}async pollStatus(e){try{if(Date.now()-this.pollingStartTime>gt.timeout){this.stopPolling(),this.handleTimeout();return}let r=await this.apiClient.pollStatus(e);this.consecutivePollingErrors=0,this.log("Status received",{state:r.state,complete:r.complete}),this.emit("statusUpdate",{sessionId:e,status:r.state,proofVerified:r.proofVerified}),r.state==="proof_ok"?(this.log("Proof verified, redeeming session"),this.stopPolling(),await this.redeemSession(e)):r.state==="verified"?(this.log("Session already verified"),this.stopPolling(),this.handleVerified(e,r)):r.state==="expired"?(this.log(Or),this.stopPolling(),this.handleExpired()):r.state==="revoked"?(this.log("Session revoked"),this.stopPolling(),this.handleError("session_revoked",new Error(r.error||"Session revoked"))):r.state==="pending"&&this.updatePollingInterval()}catch(t){this.consecutivePollingErrors++,this.log("Polling error",{error:t,consecutiveErrors:this.consecutivePollingErrors}),t instanceof Ce&&t.retryAfterMs&&(this.log("Honouring Retry-After header",{retryAfterMs:t.retryAfterMs}),this.currentPollingInterval=t.retryAfterMs,this.pollingIntervalId!==null&&(clearInterval(this.pollingIntervalId),this.pollingIntervalId=window.setInterval(()=>{this.currentChallenge&&this.pollStatus(this.currentChallenge.sessionId)},this.currentPollingInterval))),this.consecutivePollingErrors>=5&&(this.log("Circuit breaker triggered after consecutive errors",{count:this.consecutivePollingErrors}),this.stopPolling(),this.handleError("polling_circuit_breaker",new Error(`Polling stopped after ${this.consecutivePollingErrors} consecutive errors`)))}}async redeemSession(e){try{this.updateOverlayStatus("Completing verification...");let t=this.pkceManager.getVerifier(e);if(!t)throw new Error("PKCE verifier not found");let r=await this.apiClient.redeemSession(e,t);this.log("Session redeemed",{verifiedAt:r.verifiedAt}),this.pkceManager.clearVerifier(e),this.handleVerified(e,{sessionId:e,state:"verified",complete:!0,createdAt:0,expiresAt:r.expiresAt,proofVerified:!0,remainingChecks:0})}catch(t){this.handleError("redemption_failed",t)}}handleVerified(e,t){this.log("Verification successful"),Se.set({sessionId:e,verifiedAt:Math.floor(Date.now()/1e3),expiresAt:t.expiresAt,origin:window.location.origin}),this.hideOverlay(),this.emit("verified",{sessionId:e,verifiedAt:Date.now()})}handleTimeout(){this.log("Verification timeout"),this.updateOverlayStatus("Verification timed out. Please refresh the page to try again.",!0),this.emit("timeout",{message:"Verification timed out"})}handleExpired(){this.log(Or),Se.clear(),this.updateOverlayStatus("Verification session expired. Please refresh the page to try again.",!0),this.emit("expired",{message:Or})}handleError(e,t){let r=t instanceof Error?t.message:"Unknown error";this.log("Error",{code:e,message:r}),Se.clear(),this.updateOverlayStatus("Something went wrong. Please refresh the page to try again.",!0),this.emit("error",{code:e,message:"Verification error",details:t instanceof Ce?t.code:void 0})}updatePollingInterval(){let e=Math.min(this.currentPollingInterval*gt.backoffMultiplier,gt.maxInterval);e!==this.currentPollingInterval&&(this.currentPollingInterval=e,this.log("Updating polling interval",{interval:e}),this.pollingIntervalId!==null&&(clearInterval(this.pollingIntervalId),this.pollingIntervalId=window.setInterval(()=>{this.currentChallenge&&this.pollStatus(this.currentChallenge.sessionId)},this.currentPollingInterval)))}stopPolling(){this.pollingIntervalId!==null&&(this.log("Stopping polling"),clearInterval(this.pollingIntervalId),this.pollingIntervalId=null)}showOverlay(e){if(typeof document>"u")return;this.previousFocus=document.activeElement,this.overlayElement||(this.overlayElement=this.createOverlay(),document.body.appendChild(this.shadowHost)),Array.from(document.body.children).forEach(r=>{r!==this.shadowHost&&r instanceof HTMLElement&&r.setAttribute("inert","")}),this.updateOverlayStatus(e);let t=this.shadowRoot?.querySelector(Tn);t&&(t.setAttribute("tabindex","-1"),t.focus())}updateOverlayWithChallenge(e){if(!this.shadowRoot)return;let t=this.shadowRoot.querySelector(Tn);if(!t)return;let r=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);if(t.innerHTML=r?`
      <h2 id="provii-overlay-heading">Age Verification Required</h2>
      <p>Please verify your age to continue using your Provii Wallet app</p>
      <div class="provii-mobile-link">
        <a href="${this.escapeHtml(e.deepLink)}" class="provii-button">Open Provii Wallet</a>
      </div>
      <p class="provii-challenge-code">Or enter code manually: ${this.escapeHtml(e.challengeCode)}</p>
      <p class="provii-instructions provii-time-notice">You have 5 minutes to complete verification. If time runs out, you will need to start a new verification.</p>
      <p class="provii-help-container"><a href="https://provii.app/help" target="_blank" rel="noopener" aria-label="Need help with age verification? (opens in new tab)" class="provii-help-link">Need help?</a></p>
      ${this.config.allowClose?'<button class="provii-close-button" aria-label="Close age verification"><span aria-hidden="true">\xD7</span></button>':""}
    `:`
      <h2 id="provii-overlay-heading">Age Verification Required</h2>
      <p>Please verify your age to continue using your Provii Wallet app</p>
      <div class="provii-qr-container">
        <canvas class="provii-qr-code qr-canvas" role="img" aria-label="QR code for age verification. Alternatively, enter code ${this.escapeHtml(e.challengeCode)} in Provii Wallet."></canvas>
      </div>
      <p class="provii-challenge-code">Code: ${this.escapeHtml(e.challengeCode)}</p>
      <p class="provii-instructions">Scan the <abbr title="Quick Response">QR</abbr> code with your Provii Wallet app or enter the code manually</p>
      <p class="provii-instructions provii-time-notice">You have 5 minutes to complete verification. If time runs out, you will need to start a new verification.</p>
      <p class="provii-help-container"><a href="https://provii.app/help" target="_blank" rel="noopener" aria-label="Need help with age verification? (opens in new tab)" class="provii-help-link">Need help?</a></p>
      ${this.config.allowClose?'<button class="provii-close-button" aria-label="Close age verification"><span aria-hidden="true">\xD7</span></button>':""}
    `,!r){let i=t.querySelector(".provii-qr-code");if(i){let o=JSON.stringify({challenge_id:e.challengeId});qt(i,o,{width:200,margin:1}).catch(s=>this.log("QR render failed",{error:s}))}}if(this.overlayElement&&(this.overlayElement.removeAttribute("aria-label"),this.overlayElement.setAttribute("aria-labelledby","provii-overlay-heading")),this.config.allowClose){let i=t.querySelector(".provii-close-button");i&&i.addEventListener("click",()=>{this.hideOverlay(),this.stopPolling(),this.emit("closed",{})})}}updateOverlayStatus(e,t=!1){if(!this.overlayElement||!this.shadowRoot)return;this.overlayElement.removeAttribute("aria-labelledby"),this.overlayElement.setAttribute("aria-label","Age verification");let r=this.shadowRoot.querySelector(Tn);if(r)if(t){r.innerHTML=`
        <div role="alert" aria-live="assertive">
          <p class="provii-status-message">${this.escapeHtml(e)}</p>
        </div>
        <button class="provii-retry-button">Try Again</button>
      `;let i=r.querySelector(".provii-retry-button");i&&(i.addEventListener("click",()=>{window.location.reload()}),requestAnimationFrame(()=>i.focus()))}else r.innerHTML=`
        <div role="status" aria-live="polite">
          <p class="provii-status-message">${this.escapeHtml(e)}</p>
        </div>
      `}hideOverlay(){this.shadowHost&&(Array.from(document.body.children).forEach(e=>{e instanceof HTMLElement&&e.hasAttribute("inert")&&e.removeAttribute("inert")}),this.shadowHost.remove(),this.shadowHost=null,this.shadowRoot=null,this.overlayElement=null),this.previousFocus&&(this.previousFocus.focus(),this.previousFocus=null)}createOverlay(){let e=document.createElement("div"),t=Oe(e,this.config.cspNonce);this.shadowHost=e,this.shadowRoot=t,this.injectOverlayStyles();let r=document.createElement("div");return r.className="provii-age-gate-overlay",r.setAttribute("lang","en"),r.setAttribute("role","dialog"),r.setAttribute("aria-modal","true"),r.setAttribute("aria-label","Age verification"),r.innerHTML=`
      <div class="provii-overlay-content">
        <div role="status" aria-live="polite" aria-atomic="true">
          <p>Loading...</p>
        </div>
      </div>
    `,t.appendChild(r),r.addEventListener("keydown",i=>{if(i.key==="Escape"&&this.config.allowClose){this.hideOverlay(),this.stopPolling(),this.emit("closed",{});return}if(i.key==="Tab"){let o=t.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])');if(o.length===0){let g=t.querySelector(Tn);g&&(g.setAttribute("tabindex","-1"),g.focus());return}let s=o.item(0),l=o.item(o.length-1);if(!s||!l)return;let d=t.activeElement;i.shiftKey&&d===s?(i.preventDefault(),l.focus()):!i.shiftKey&&d===l&&(i.preventDefault(),s.focus())}}),r}injectOverlayStyles(){this.shadowRoot&&Sr(this.shadowRoot,this.getStyles(),this.config.cspNonce)}getStyles(){return this.config.style==="custom"&&this.config.customStyles?this.config.customStyles:`
      .provii-age-gate-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      .provii-overlay-content {
        background: white;
        padding: 40px;
        border-radius: 12px;
        max-width: 500px;
        text-align: center;
        position: relative;
      }

      .provii-overlay-content h2 {
        margin: 0 0 16px 0;
        font-size: 1.5rem;
        line-height: 1.5;
        font-weight: 700;
        color: #1a1a1a;
      }

      .provii-overlay-content p {
        margin: 0 0 24px 0;
        font-size: 1rem;
        line-height: 1.5;
        color: #545454;
      }

      .provii-qr-container {
        margin: 24px 0;
      }

      .provii-qr-code {
        max-width: 300px;
        width: 100%;
        height: auto;
        border-radius: 8px;
      }

      .provii-challenge-code {
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: 2px;
        color: #1a1a1a;
        margin: 16px 0;
      }

      .provii-instructions {
        font-size: 0.875rem;
        color: #545454;
      }

      .provii-mobile-link {
        margin-top: 24px;
      }

      .provii-button {
        display: inline-block;
        padding: 12px 24px;
        background: #004A99;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 700;
        min-height: 44px;
        transition: background 0.2s;
      }

      .provii-button:focus-visible {
        outline: 3px solid #FFFFFF;
        outline-offset: 2px;
        box-shadow: 0 0 0 6px rgba(0, 0, 0, 0.5);
      }

      .provii-button:hover {
        background: #003D80;
      }

      .provii-close-button {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 2rem;
        color: #545454;
        cursor: pointer;
        padding: 4px;
        width: 44px;
        height: 44px;
        line-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .provii-close-button:hover {
        color: #1a1a1a;
      }

      .provii-close-button:focus-visible {
        outline: 3px solid #FFFFFF;
        outline-offset: 2px;
        box-shadow: 0 0 0 6px rgba(0, 0, 0, 0.5);
      }

      .provii-retry-button:focus-visible {
        outline: 3px solid #FFFFFF;
        outline-offset: 2px;
        box-shadow: 0 0 0 6px rgba(0, 0, 0, 0.5);
      }

      .provii-overlay-content a:focus-visible {
        outline: 3px solid #004A99;
        outline-offset: 2px;
        border-radius: 2px;
      }

      .provii-time-notice {
        margin-top: 8px;
        font-size: 0.75rem;
      }

      .provii-help-container {
        margin: 16px 0 0;
        font-size: 0.8125rem;
        text-align: center;
      }

      .provii-help-link {
        color: #344196;
        display: inline-block;
        padding: 12px 8px;
        min-height: 44px;
      }

      .provii-retry-button {
        display: inline-block;
        margin-top: 16px;
        padding: 12px 24px;
        background: #004A99;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        min-height: 44px;
      }

      .provii-status-message {
        font-size: 1rem;
        color: #545454;
      }

      @media (prefers-reduced-motion: reduce) {
        .provii-button {
          transition: none;
        }
      }

      @media screen and (max-width: 360px) {
        .provii-overlay-content {
          padding: 20px;
          margin: 10px;
          max-width: calc(100% - 20px);
        }
      }
    `}escapeHtml(e){let t=document.createElement("div");return t.textContent=e,t.innerHTML}on(e,t){this.eventHandlers.has(e)||this.eventHandlers.set(e,new Set),this.eventHandlers.get(e)?.add(t)}off(e,t){this.eventHandlers.get(e)?.delete(t)}emit(e,t){let r=this.eventHandlers.get(e);r&&r.forEach(i=>{try{i(t)}catch(o){console.error(`[Provii Age Gate] Error in ${e} handler:`,o)}})}log(e,t){this.config.debug&&console.debug(`[AutoBlockMode] ${e}`,t||"")}};(async()=>{if(typeof window>"u"||typeof document>"u")return;let n=window;n.__proviiAutoBlockInitialised||(n.__proviiAutoBlockInitialised=!0,document.readyState==="loading"?document.addEventListener("DOMContentLoaded",jo):await jo())})();async function jo(){try{let n=Go();if(!n){console.warn("[Provii Age Gate] Script tag not found. Auto-block mode not initialised.");return}let e=Ho(n),t=new Rn(e);await t.initialise(),window.ProviiAgeGate=t}catch(n){n instanceof we?console.error("[Provii Age Gate] Configuration error:",n.message):console.error("[Provii Age Gate] Initialisation failed")}}var yd=jt;typeof window<"u"&&(window.AgeGate=jt);})();

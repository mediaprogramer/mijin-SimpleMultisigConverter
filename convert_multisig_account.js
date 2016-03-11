//NEM標準時
var NEM_EPOCH = Date.UTC(2015, 2, 29, 0, 6, 25, 0);
var _hexEncodeArray = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

function hex2ua_reversed(hexx) {
	var hex = hexx.toString();//force conversion
	var ua = new Uint8Array(hex.length / 2);
	for (var i = 0; i < hex.length; i += 2) {
		ua[ua.length - 1 - (i / 2)] = parseInt(hex.substr(i, 2), 16);
	}
	return ua;
};
function ua2hex(ua) {
	var s = '';
	for (var i = 0; i < ua.length; i++) {
		var code = ua[i];
		s += _hexEncodeArray[code >>> 4];
		s += _hexEncodeArray[code & 0x0F];
	}
	return s;
};
	
function hex2ua (hexx) {
	var hex = hexx.toString();//force conversion
	var ua = new Uint8Array(hex.length / 2);
	for (var i = 0; i < hex.length; i += 2) {
		ua[i / 2] = parseInt(hex.substr(i, 2), 16);
	}
	return ua;
};


function serializeTransferTransaction (entity) {

	var r = new ArrayBuffer(512 + 2764);
	var d = new Uint32Array(r);
	var b = new Uint8Array(r);
	d[0] = entity['type'];
	d[1] = entity['version'];
	d[2] = entity['timeStamp'];

	var temp = hex2ua(entity['signer']);
	d[3] = temp.length;
	var e = 16;
	for (var j = 0; j<temp.length; ++j) { 
		b[e++] = temp[j]; 
	}

	// Transaction
	var i = e / 4;
	d[i++] = entity['fee'];
	d[i++] = Math.floor((entity['fee'] / 0x100000000));
	d[i++] = entity['deadline'];
	e += 12;

	// Aggregate modification transaction part
	// Number of cosignatory modifications
	d[i++] = entity['modifications'].length;

	e += 4;

	// The following part is repeated for every cosignatory modification
	for(var h = 0; h < entity['modifications'].length;h++) {

		i = e / 4;
		// 1.Length of cosignatory modification structure:4byte(integer)
		d[i++] = 0x28;
		
		// 2.Modification type:4byte (integer)
		// Add cosignatory:0x01 , Delete cosignatory:0x02
		d[i++] = entity['modifications'][h]['modificationType'];

		// Lenght of cosignatory's public key byte array(always 32):4bytes(integer)
		temp = hex2ua(entity['modifications'][h]['cosignatoryAccount']);
		d[i++] = temp.length;
		e += 12;
		// Public key bytes of cosignatory:32bytes		console.log("cosignatoryAccount = " + temp);
		for (var j = 0; j<temp.length; ++j) { b[e++] = temp[j]; }
	}
	i = e / 4;
	// Length of minimum cosignatories modification structure:4bytes(integer)
	d[i++] = 4;
	// Relative change : 4bytes(integer)
	d[i++] = entity['minCosignatories']['relativeChange'];
	e += 8;

	return new Uint8Array(r, 0, e);
}




var CURRENT_NETWORK_ID = 96;
var CURRENT_NETWORK_VERSION = function(val) {

	if (CURRENT_NETWORK_ID === 104) {
		return 0x68000000 | val;
	} else if (CURRENT_NETWORK_ID === -104) {
		return 0x98000000 | val;
	}
	return 0x60000000 | val;
};

function fixPrivateKey(privatekey) {
	return ("0000000000000000000000000000000000000000000000000000000000000000" + privatekey.replace(/^00/, '')).slice(-64);
}

function convertMultisigAccountRequest(){

	var due = 60;
	var timeStamp = Math.floor((Date.now() / 1000) - (NEM_EPOCH / 1000));

	var data ={
		'type': 0x1001,
		'version': CURRENT_NETWORK_VERSION(2),
		'signer': SENDER_PUBLIC_KEY,
		'timeStamp': timeStamp,
		'deadline': timeStamp + due * 60
	};

	var custom = {
		'fee': 28000000,
		'modifications':MODIFICATIONS,
		"minCosignatories" : {"relativeChange": 2 }
	};

	var entity = $.extend(data, custom);

	var result = serializeTransferTransaction(entity);
	var kp = KeyPair.create(fixPrivateKey(SENDER_PRIVATE_KEY));  
	var signature = kp.sign(result);
	var obj = {'data':ua2hex(result), 'signature':signature.toString()};

	console.log(entity);
	console.log(result);
	console.log(obj);

	return $.ajax({
		url: URL_TRANSACTION_ANNOUNCE  ,
		type: 'POST',
		contentType:'application/json',
		data: JSON.stringify(obj)  ,
		error: function(XMLHttpRequest) {
			console.log( $.parseJSON(XMLHttpRequest.responseText));
		}
	});
}


# JavaScriptEnum

This package allows defining flexible enum classes.

```javascript
import { Enum, FlagsEnum } from 'com.recoyxgroup.javascript.enum';

// regular enums

const E = Enum('E', [
	'FOO_CONST',

	// const definition can manually specify a (String, Number) pair
	['BAR_CONST', 1],
	['BAR2_CONST', 10, 'barTwo'],
]);

// flags enums

const E = FlagsEnum('E', [
	'FA',
	'FB',
]);
```

Applying enums:

```javascript
class C {
	_e = E(undefined);
	get e() { return this._e }
	set e(v) { this._e = E(v) }
}

var o = new C;

o.e = 'fa';
o.e = ['fa', 'fb'];
o.e = undefined; // o.e = 0
o.e = E.FA;

console.log( o.e == 'fa' );
console.log( 'fa' in o.e );
```

Instance properties:
- number:Number

FlagsEnum products > Instance methods:
- set(arg:E):E
- exclude(arg:E):E
- toggle(arg:E):E
- filter(arg:E):E
- toString():String

Related utilities:
- com.recoyxgroup.javascript.enum.JSON.stringify(value:\*, options:\* = undefined):String &dash; This is a JSON.stringify() specialization that will convert any enum object to a Number.
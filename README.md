##### com.siteblade.util

## Enums

Defining enums:

```javascript
import { Enum, FlagsEnum } from 'com.siteblade.util';

// simple enums

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
	_e;

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
- com.siteblade.util.JSON.stringify(value:\*, options:\* = undefined):String &dash; This will convert the enum to a Number.

## Integer types

Int and UnsignedInt are 64-bit integer data types used as BigInt.

Instance methods:
- equals(arg):Boolean
- add(arg)
- subtract(arg)
- multiply(arg)
- divide(arg)
- remainder(arg)
- valueOf():BigInt
const esJSON = typeof window == 'object' ? window.JSON : global.JSON;

export const JSON = {};

JSON.parse = esJSON.parse;

/** */
JSON.stringify = function(value, options = undefined) {
    if (typeof value == 'string' || typeof value == 'number' || typeof value == 'boolean' || !value) return esJSON.stringify(value);

    else if (value instanceof Array) {
        let r = value.map(el => JSON.stringify(el));
        return `[${r.join(',')}]`;
    }
    else if (value instanceof Int || value instanceof UInt || value instanceof Long || value instanceof ULong) return String(value.valueOf());

    else if (value.constructor !== Object) return typeof value.number == 'number' ? String(Number(value.number)) : JSON.stringify(value.toString());

    else {
        let props = [];

        for (let name in value) props.push(`${esJSON.stringify(name)}:${JSON.stringify(value[name])}`);

        let r = `{${props.join(',')}}`;

        if (typeof options == 'object') r = esJSON.stringify(esJSON.parse(r), options);

        return r;
    }
};

export class StringExtension {
    static apply(str, ...rest) {
        while (rest[0] instanceof Array) rest = rest[0];
        var variables = undefined;
        if (rest.length == 1 && !(rest[0] instanceof Array)) variables = rest[0];
        return str.replace(/\$([a-zA-Z0-9]+|\$|\d+)/g, (_, argument) => {
            if (argument == '$') return '$';
            if (!variables) {
                var i = Number(argument);
                return i <= rest.length ? rest[i - 1] : 'undefined';
            }
            else return variables[argument];
        });
    }
}

export class LiveValue {
    _value;
    _listeners = [];

    constructor(initialValue) {
        this._value = initialValue;
    }

    get value() {
        return this._value;
    }

    get() {
        return this._value;
    }

    set(value) {
        this._value = value;
        for (let fn of this._listeners)
            fn(this._value);
    }

    subscribe(fn) {
        return this.setListener(fn);
    }

    setListener(fn) {
        this._listeners.push(fn);
        fn(this._value);
        return () => {
            let i = this._listeners.indexOf(fn);
            if (i != -1) this._listeners.splice(i, 1);
        };
    }
}

/**
 * Creates an enum class like ShockScript enums.
 *
 * @param {*} constants
 */
export function Enum(name, constantSpecifiers) {
    let constantByName = new Map;

    class E {
        _value;

        constructor(argument) {
            this._value = Number(argument);
            Object.freeze(this);
        }

        equals(argument) {
            return this._value == eProxy(argument)._value;
        }

        toString() {
            for (let [name, value] of constantByName)
                if (this._value == value._value)
                    return name;
            return '';
        }

        get number() {
            return this._value;
        }

        valueOf() {
            return this.toString();
        }
    }

    let counter = 0;

    for (let cfg of constantSpecifiers) {
        let constSpec = transformConstantSpec(cfg, counter);
        let oConst = new E(constSpec.value);
        E[constSpec.propertyName] = oConst;
        constantByName.set(constSpec.name, oConst);
        counter = constSpec.value + 1;
    }

    E._enum = true;

    let eProxy = new Proxy(E, {
        apply(target, thisArg, argumentsList) {
            let [ argument ] = argumentsList;
            if (argument instanceof E)
                return argument;
            if (typeof argument == 'string') {
                let v = constantByName.get(argument);
                if (v === undefined)
                    throw new ReferenceError(name + ' has no constant ' + argument);
                return v;
            }
            argument >>>= 0;
            for (let [, value] of constantByName)
                if (value._value === argument) return value;
            throw new Error(`${name} has no constant of number ${argument}`);
        },
    });

    return eProxy;
}

/**
 * Creates a flags enum class like ShockScript enums.
 *
 * @param {*} constants
 */
export function FlagsEnum(name, constantSpecifiers) {
    let constantByName = new Map;

    let instanceProxy = {
        has(target, argument) {
            if (typeof argument == 'symbol')
                return false;
            return target.has(argument);
        },
    };

    class E {
        _value;

        constructor(argument) {
            this._value = argument >>> 0;
            Object.freeze(this);
            return new Proxy(this, instanceProxy);
        }

        equals(argument) {
            return this._value == eProxy(argument)._value;
        }

        set(argument) {
            return new E(this._value | eProxy(argument)._value);
        }

        exclude(argument) {
            var lv = this._value;
            var rv = eProxy(argument)._value;
            return new E(lv & rv ? lv ^ rv : lv);
        }

        toggle(argument) {
            return new E(this._value ^ eProxy(argument)._value);
        }

        filter(argument) {
            return new E(this._value & eProxy(argument)._value);
        }

        has(argument) {
            return !!(this._value & eProxy(argument)._value);
        }

        toString() {
            var list = [];
            for (let [name, value] of constantByName)
                if (this._value & value._value)
                    list.push(name);
            return list.join(',');
        }

        get number() {
            return this._value;
        }

        valueOf() {
            return this.toString();
        }
    }

    let counter = 1;

    for (let cfg of constantSpecifiers) {
        let constSpec = transformConstantSpec(cfg, counter);
        let oConst = new E(constSpec.value);
        E[constSpec.propertyName] = oConst;
        constantByName.set(constSpec.name, oConst);
        counter = constSpec.value * 2;
    }

    E._enum = true;
    E._flagsEnum = true;

    let eProxy = new Proxy(E, {
        apply(target, thisArg, argumentsList) {
            let [ argument ] = argumentsList;
            if (argument instanceof E)
                return argument;
            if (typeof argument == 'string') {
                let v = 0;
                if (argument.indexOf(',') == -1) {
                    let v = constantByName.get(argument);
                    if (v === undefined)
                        throw new ReferenceError(name + ' has no constant ' + argument);
                    return v;
                }
                for (let constantName of argument.split(',')) {
                    if (!constantName)
                        continue;
                    let v2 = constantByName.get(constantName);
                    if (v2 === undefined)
                        throw new ReferenceError(name + ' has no constant ' + constantName);
                    v |= v2._value;
                }
                return new E(v);
            }
            if (argument instanceof Array)
                return argument.length > 1 ? new E(argument.reduce((x,y) => eProxy(x)._value | eProxy(y)._value)) : new E(eProxy(argument[0]));
            return new E(argument >>> 0);
        },
    });

    return eProxy;
}

function transformConstantSpec(spec, counter) {
    let sp = '';
    let name = '';
    let value = counter;

    if (typeof spec == 'string')
        sp = spec,
        name = transformConstantName(sp);
    else if (spec instanceof Array) {
        sp = spec[0];
        let cfgPair = spec.slice(1);
        cfgPair = cfgPair[0] instanceof Array ? cfgPair[0] : cfgPair;
        name = typeof cfgPair[0] == 'string' ? cfgPair[0] : typeof cfgPair[1] == 'string' ? cfgPair[1] : transformConstantName(sp);
        value = typeof cfgPair[0] == 'number' ? cfgPair[0] : typeof cfgPair[1] == 'number' ? cfgPair[1] : value;
    }
    else throw new Error('Illegal constant specification.');

    return {
        propertyName: sp,
        name,
        value,
    };
}

function transformConstantName(name) {
    let split = name.split('_');
    let r = [split.shift().toLowerCase()];
    for (let part of split) {
        if (!part) continue;
        r.push(part.charAt(0).toUpperCase(), part.slice(1).toLowerCase());
    }
    return r.join('');
}

/**
 * @description 32-bit signed integer data type.
 * @constructor
 * @param {*} value
 */
export function Int(value = undefined) {
    if (!this) return new Int(value);

    if (value instanceof Int) value = value.valueOf();

    this._value = Int.filterNumber(Number(value));
}

/** */
Int.MIN_VALUE = -0x80000000;

/**  */
Int.MAX_VALUE = 0x7fffffff;

Int.filterNumber = function(value) {
    return value < Int.MIN_VALUE ? Int.MIN_VALUE : value > Int.MAX_VALUE ? Int.MAX_VALUE : value;
};

/**
 * @param {Int} value 
 * @return {Boolean}
 */
Int.prototype.equals = function(value) {
    return this._value == Int(value).valueOf();
};

/**
 * @param {Int} value 
 * @return {Int}
 */
Int.prototype.add = function(value) {
    return Int(Int.filterNumber(this._value + Int(value).valueOf()));
};

/**
 * @param {Int} value 
 * @return {Int}
 */
Int.prototype.subtract = function(value) {
    return Int(Int.filterNumber(this._value - Int(value).valueOf()));
};

/**
 * @param {Int} value 
 * @return {Int}
 */
Int.prototype.multiply = function(value) {
    return Int(Int.filterNumber(this._value * Int(value).valueOf()));
};

/**
 * @param {Int} value 
 * @return {Int}
 */
Int.prototype.divide = function(value) {
    return Int(Int.filterNumber(this._value / Int(value).valueOf()));
};

/**
 * @param {Int} value 
 * @return {Int}
 */
Int.prototype.remainder = function(value) {
    return Int(Int.filterNumber(this._value % Int(value).valueOf()));
};

/**
 * @param {Int} exp
 * @return {Int}
 */
Int.prototype.pow = function(exp) {
    return Int(Int.filterNumber(this._value ** Int(exp)._value));
};

/**
 * @return {Number}
 */
Int.prototype.valueOf = function() {
    return this._value;
};

/**
 * @param {Number} radix 
 */
Int.prototype.toString = function(radix = undefined) {
    return this._value.toString(radix);
};

/**
 * @description 32-bit unsigned integer data type.
 * @constructor
 * @param {*} value
 */
export function UInt(value = undefined) {
    if (!this) return new UInt(value);

    if (value instanceof UInt) value = value.valueOf();

    this._value = UInt.filterNumber(Number(value));
}

/** */
UInt.MIN_VALUE = 0;

/**  */
UInt.MAX_VALUE = 0xffffffff;

UInt.filterNumber = function(value) {
    return value < UInt.MIN_VALUE ? UInt.MIN_VALUE : value > UInt.MAX_VALUE ? UInt.MAX_VALUE : value;
};

/**
 * @param {UInt} value 
 * @return {Boolean}
 */
UInt.prototype.equals = function(value) {
    return this._value == UInt(value)._value;
};

/**
 * @param {UInt} value 
 * @return {UInt}
 */
UInt.prototype.add = function(value) {
    return UInt(UInt.filterNumber(this._value + UInt(value)._value));
};

/**
 * @param {UInt} value 
 * @return {UInt}
 */
UInt.prototype.subtract = function(value) {
    return UInt(UInt.filterNumber(this._value - UInt(value)._value));
};

/**
 * @param {UInt} value 
 * @return {UInt}
 */
UInt.prototype.multiply = function(value) {
    return UInt(UInt.filterNumber(this._value * UInt(value)._value));
};

/**
 * @param {UInt} value 
 * @return {UInt}
 */
UInt.prototype.divide = function(value) {
    return UInt(UInt.filterNumber(this._value / UInt(value)._value));
};

/**
 * @param {UInt} value 
 * @return {UInt}
 */
UInt.prototype.remainder = function(value) {
    return UInt(UInt.filterNumber(this._value % UInt(value)._value));
};

/**
 * @param {UInt} exp
 * @return {UInt}
 */
UInt.prototype.pow = function(exp) {
    return UInt(UInt.filterNumber(this._value ** UInt(exp)._value));
};

/**
 * @return {Number}
 */
UInt.prototype.valueOf = function() {
    return this._value;
};

/**
 * @param {Number} radix 
 */
UInt.prototype.toString = function(radix = undefined) {
    return this._value.toString(radix);
};

/**
 * @description 64-bit signed integer data type.
 * @constructor
 * @param {*} value
 */
export function Long(value = undefined) {
    if (!this) return new Long(value);

    if (value instanceof Long) value = value.valueOf();

    this._value = Long.filterNumber(BigLong(value));
}

/** */
Long.MIN_VALUE = -0x8000000000000000n;

/**  */
Long.MAX_VALUE = 0x7fffffffffffffffn;

Long.filterNumber = function(value) {
    return value < Long.MIN_VALUE ? Long.MIN_VALUE : value > Long.MAX_VALUE ? Long.MAX_VALUE : value;
};

/**
 * @param {Long} value 
 * @return {Boolean}
 */
Long.prototype.equals = function(value) {
    return this._value == Long(value).valueOf();
};

/**
 * @param {Long} value 
 * @return {Long}
 */
Long.prototype.add = function(value) {
    return Long(Long.filterNumber(this._value + Long(value).valueOf()));
};

/**
 * @param {Long} value 
 * @return {Long}
 */
Long.prototype.subtract = function(value) {
    return Long(Long.filterNumber(this._value - Long(value).valueOf()));
};

/**
 * @param {Long} value 
 * @return {Long}
 */
Long.prototype.multiply = function(value) {
    return Long(Long.filterNumber(this._value * Long(value).valueOf()));
};

/**
 * @param {Long} value 
 * @return {Long}
 */
Long.prototype.divide = function(value) {
    return Long(Long.filterNumber(this._value / Long(value).valueOf()));
};

/**
 * @param {Long} value 
 * @return {Long}
 */
Long.prototype.remainder = function(value) {
    return Long(Long.filterNumber(this._value % Long(value).valueOf()));
};

/**
 * @param {Long} exp
 * @return {Long}
 */
Long.prototype.pow = function(exp) {
    return Long(Long.filterNumber(this._value ** Long(exp)._value));
};

/**
 * @return {BigLong}
 */
Long.prototype.valueOf = function() {
    return this._value;
};

/**
 * @param {Number} radix 
 */
Long.prototype.toString = function(radix = undefined) {
    return this._value.toString(radix);
};

/**
 * @description 64-bit unsigned Longeger data type.
 * @constructor
 * @param {*} value
 */
export function ULong(value = undefined) {
    if (!this)
        return new ULong(value);
    if (value instanceof ULong)
        value = value.valueOf();
    this._value = ULong.filterNumber(BigLong(value));
}

/** */
ULong.MIN_VALUE = 0;

/**  */
ULong.MAX_VALUE = 0xffffffffffffffffn;

ULong.filterNumber = function(value) {
    return value < ULong.MIN_VALUE ? ULong.MIN_VALUE : value > ULong.MAX_VALUE ? ULong.MAX_VALUE : value;
};

/**
 * @param {ULong} value 
 * @return {Boolean}
 */
ULong.prototype.equals = function(value) {
    return this._value == ULong(value)._value;
};

/**
 * @param {ULong} value 
 * @return {ULong}
 */
ULong.prototype.add = function(value) {
    return ULong(ULong.filterNumber(this._value + ULong(value)._value));
};

/**
 * @param {ULong} value 
 * @return {ULong}
 */
ULong.prototype.subtract = function(value) {
    return ULong(ULong.filterNumber(this._value - ULong(value)._value));
};

/**
 * @param {ULong} value 
 * @return {ULong}
 */
ULong.prototype.multiply = function(value) {
    return ULong(ULong.filterNumber(this._value * ULong(value)._value));
};

/**
 * @param {ULong} value 
 * @return {ULong}
 */
ULong.prototype.divide = function(value) {
    return ULong(ULong.filterNumber(this._value / ULong(value)._value));
};

/**
 * @param {ULong} value 
 * @return {ULong}
 */
ULong.prototype.remainder = function(value) {
    return ULong(ULong.filterNumber(this._value % ULong(value)._value));
};

/**
 * @param {ULong} exp
 * @return {ULong}
 */
ULong.prototype.pow = function(exp) {
    return ULong(ULong.filterNumber(this._value ** ULong(exp)._value));
};

/**
 * @return {BigLong}
 */
ULong.prototype.valueOf = function() {
    return this._value;
};

/**
 * @param {Number} radix 
 */
ULong.prototype.toString = function(radix = undefined) {
    return this._value.toString(radix);
};

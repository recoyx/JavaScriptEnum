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

    else if (value.constructor !== Object) return typeof value.number == 'number' ? String(Number(value.number)) : JSON.stringify(value.toString());

    else {
        let props = [];

        for (let name in value) props.push(`${esJSON.stringify(name)}:${JSON.stringify(value[name])}`);

        let r = `{${props.join(',')}}`;

        if (typeof options == 'object') r = esJSON.stringify(esJSON.parse(r), options);

        return r;
    }
};

/**
 * Creates an enum class.
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

    E.declaredAsEnum = true;

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
 * Creates a flags enum class.
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

    E.declaredAsEnum = true;
    E.declaredAsFlagsEnum = true;

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
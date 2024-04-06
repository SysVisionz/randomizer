export type RandomOptions = {
	/** the excluded maximum value for the randomized function. @defaultValue 1 */
	max?: number,
	/** the included minimum value for the randomized function. @defaultValue 0 */
	min?: number,
	/** if you're counting the number of tries being used for some outside purpose, you can use this to run your resetFunc whenever the random generated is above that. @defaultValue options.successMinimum*/
	resetAbove?: number
	/** this is the function to be used when performing a reset. @see options.resetAbove */
	resetFunc?: () => void,
}

export type SpecialRandomOptions = RandomOptions & {
	/** the number of tries so far. By default, this will be maintained within the object, but if it is not persistent you will need to apply it yourself.*/
	tries?: number
}

const rt = (n: number, rt: number) => Math.pow(n, 1/rt)
const nearquation = (over: number, under: number, xval: number, max: number) => rt(-xval, (over/under)) * max

const nearing = (tries: number, rapidity: number, max: number) => {
	return nearquation(50, nearquation(1000, 1, rapidity, 50), tries, max)
}

interface Randomizer {
	__defaultOptions: SpecialRandomOptions & {decimal?: number, successMinimum?: number}
	__exponentialTries: number;
	__linearTries: number;
	__nearingTries: number;
	reset: {
		/** reset all tries */
		(): void;
		/** reset the linear style tries */
		linear: () => void;
		/** reset the nearing style tries */
		nearing: () => void;
		/** reset the exponential style tries */
		exponential: () => void;
	}
	/** when the linear increase moves this above the maximum value, you have a special case where it just returns the max. */


	result: <V extends ([any, `${string}%`])[], R extends Extract<keyof V, number>>(...values: V) => V[R] extends [any, `${string}%` | number] ? V[R] : V[R]
}

type RandomizedO<K extends (string | [string, number] | [string, `${number}%`])[]> = {[P in keyof K]: K[P] extends string ? [K[P], 1] : K[P]}
type RandomizedVals<K extends(string | [string, number] | [string, `${number}%`])[]> = RandomizedO<K>[number][0]

class Randomizer implements Randomizer {
	constructor(defaultOptions: SpecialRandomOptions & {decimal?: never, successMinimum?: never}, tries?: number)
	constructor(defaultOptions: SpecialRandomOptions & {decimal: number, successMinimum?: never}, tries?: number)
	constructor(defaultOptions: SpecialRandomOptions & {decimal?: never, successMinimum: number}, tries?: number)
	constructor(defaultOptions: SpecialRandomOptions & {decimal?: never, successMinimum?: never}, tries?: {linear: number, nearing: number, exponential: number})
	constructor(defaultOptions: SpecialRandomOptions & {decimal: number, successMinimum?: never}, tries?: {linear: number, nearing: number, exponential: number})
	constructor(defaultOptions: SpecialRandomOptions & {decimal?: never, successMinimum: number}, tries?: {linear: number, nearing: number, exponential: number})
	constructor(tries?: number)
	constructor(tries?: {linear: number, nearing: number, exponential: number})
	constructor(defaultOptionsOrTries: SpecialRandomOptions & {decimal?: number, successMinimum?: number} | number | {linear: number, nearing: number, exponential: number} = 0, tries: number | {linear: number, nearing: number, exponential: number} = 0) {
		tries = tries || typeof defaultOptionsOrTries === 'object' && defaultOptionsOrTries !== null && Object.keys(defaultOptionsOrTries).some(v => v.match(/(^linear$|^nearing$|^number$)/)) ? tries : defaultOptionsOrTries as number | {linear: number, nearing: number, exponential: number}
		this.__exponentialTries = (tries as {linear: number, nearing: number, exponential: number})?.linear || tries as number;
		this.__linearTries = (tries as {linear: number, nearing: number, exponential: number})?.nearing || tries as number;
		this.__nearingTries = (tries as {linear: number, nearing: number, exponential: number})?.exponential || tries as number;
		this.linearIncrease = this.linearIncrease.bind(this)
		this.nearingIncrease = this.nearingIncrease.bind(this)
		this.exponentialIncrease = this.exponentialIncrease.bind(this)
		const defaultOptions = typeof defaultOptionsOrTries === 'object' && defaultOptionsOrTries !== null && Object.keys(defaultOptionsOrTries).some(v => v.match(/(^linear$|^nearing$|^number$)/)) ? defaultOptionsOrTries : {}
		this.__defaultOptions = defaultOptions as SpecialRandomOptions & {decimal?: number, successMinimum?: number}
	}

	r(options?: RandomOptions & {successMinimum?: never, decimal?: never}): number
	r(options?: RandomOptions & {successMinimum: number, decimal?: never}): boolean
	r(options?: RandomOptions & {successMinimum?: never, decimal: true | number}): string
	r({max = 1, min = 0, decimal, successMinimum = this.__defaultOptions.successMinimum, resetAbove = this.__defaultOptions.resetAbove || successMinimum, resetFunc = this.__defaultOptions.resetFunc }: RandomOptions & {successMinimum?: number, decimal?: number | true} = {}) {
		const num = Math.random() * (max-min) + min	
		if (typeof resetAbove === 'number' && num > resetAbove){
			resetFunc?.()
		}
		if (typeof successMinimum === 'number'){
			return num >= successMinimum;
		}
		else if (decimal === true){
			return num.toFixed(decimal === true ? 2 : decimal) as string;
		}
		else if (!decimal){
			return num as number;
		}
		else {
			return num
		}
	}

	reset = new Proxy<Randomizer['reset']>((() => {}) as any, {
		apply: (_t, _thisArg, _args) => {
			this.__exponentialTries = 0;
			this.__linearTries = 0;
			this.__nearingTries = 0;
		},
		get: (t, prop: string) => {
			return () => {
				const toReset: any = `__${prop.substring(0, 1).toUpperCase()}${prop.substring(1)}Tries`
				this[toReset as '__exponentialTries' | '__linearTries' | '__nearingTries'] = 0;
			}
		}
	})
	
	/** this creates a random number that increases linearly with each try. */
	linearIncrease (
		/** how fast do you want your minimum to increase? This is a percentage of the difference between minimum and maximum. 
		* @defaultValue 1
		*/
	rapidity?: number,
	options?: SpecialRandomOptions & {successMinimum: number, decimal?: never}): boolean;

	linearIncrease (
		/** how fast do you want your minimum to increase? This is a percentage of the difference between minimum and maximum. 
		* @defaultValue 1
		*/
	rapidity?: number,
	options?: SpecialRandomOptions & {successMinimum?: never, decimal?: never}): number
	
	linearIncrease (
		/** how fast do you want your minimum to increase? This is a percentage of the difference between minimum and maximum. 
		* @defaultValue 1
		*/
	rapidity?: number,
	options?: SpecialRandomOptions & {successMinimum: never, decimal: true | number}): string
	linearIncrease (rapidity = 1, {max = this.__defaultOptions.max || 1, min = this.__defaultOptions.min || 0, decimal, tries = this.__defaultOptions.tries || this.__linearTries, successMinimum = this.__defaultOptions.successMinimum}: SpecialRandomOptions & {successMinimum?: number, decimal?: true | number} = {}) {
		min += (max-min)*rapidity*tries/100;
		const retval = min >= max ? max : this.r({max, min})
		return !decimal && typeof successMinimum === 'number' ? retval >= successMinimum
				: typeof decimal === 'number' || decimal === true ? retval.toFixed(decimal === true ? 2 : decimal)
				: retval
	}

	/** this creates a random number that whose minimum value slowly nears a maximum, non-inclusive value with each try. */
	nearingIncrease (
		/** how fast do you want your minimum to increase? It's recommended to keep this below 10. 
		* @defaultValue 1
		*/
	rapidity?: number,
	options?: SpecialRandomOptions & {
		/** if the random number returned is above this number, this function returns true. If it is below this number, this function returns false. 
		* @excludes: options.decimal
		*/
		successMinimum: number, 
		/** decimal places in returned value. If provided, this causes the random number to be returned as a string. */
		decimal?: never}): boolean

		/** this creates a random number that whose minimum value slowly nears a maximum, non-inclusive value with each try. */
		nearingIncrease (
		/** how fast do you want your minimum to increase? It's recommended to keep this below 10. 
		* @defaultValue 1
		*/
	rapidity?: number,
	options?: SpecialRandomOptions & {
			/** if the random number returned is above this number, this function returns true. If it is below this number, this function returns false.
			* @excludes: options.decimal
			*/
			successMinimum?: never,
			/** decimal places in returned value. This causes the random number to be returned as a string. */
			decimal: true | number
		}): string
	nearingIncrease(
		options?: SpecialRandomOptions & {successMinimum: number, decimal?: never}
	): boolean
	nearingIncrease(
		options?: SpecialRandomOptions & {successMinimum?: number, decimal: true | number}
	): string
	nearingIncrease(
		options?: SpecialRandomOptions & {successMinimum?: never, decimal?: never}
	): number
	nearingIncrease (
		/** how fast do you want your minimum to increase? It's recommended to keep this below 10. 
		* @defaultValue 1
		*/
	rapidityOrOptions?: number | SpecialRandomOptions & {successMinimum?: never, decimal?: never},
	options?: SpecialRandomOptions & {successMinimum?: never, decimal?: never}): number

	nearingIncrease (rapidityOrOptions: number | SpecialRandomOptions & {successMinimum?: number, decimal?: true | number} = 1, options: SpecialRandomOptions & {successMinimum?: number, decimal?: true | number} = {}) {
		const rapidity = typeof rapidityOrOptions === 'number' ? rapidityOrOptions : 1
		let {max = 1, min = 0, successMinimum, decimal, resetAbove = this.__defaultOptions.successMinimum || successMinimum, tries = this.__defaultOptions.tries || this.__nearingTries} =  typeof rapidityOrOptions === 'number' ? options : rapidityOrOptions
		min = nearing(tries, rapidity, max)
		return decimal ? this.r({max, min, decimal, resetAbove, resetFunc: this.reset.nearing}) : successMinimum ? this.r({max, min, successMinimum, resetAbove, resetFunc: this.reset.nearing}) : this.r({max, min, resetAbove, resetFunc: this.reset.nearing})
	}
	
	/** this creates a random number that increases exponentially with each try. */
	exponentialIncrease (
			/** how fast do you want your minimum to increase? It's recommended to keep this below 10. 
			* @defaultValue 1
			*/
			rapidity?: number,
			options?: SpecialRandomOptions & {successMinimum: never, decimal: never}): number
	exponentialIncrease (
		/** how fast do you want your minimum to increase? It's recommended to keep this below 10. 
		* @defaultValue 1
		*/
		rapidity?: number,
		options?: SpecialRandomOptions & {successMinimum: number, decimal: never}): boolean
	exponentialIncrease(
				/** how fast do you want your minimum to increase? It's recommended to keep this below 10. 
				* @defaultValue 1
				*/
				rapidity?: number,
				options?: SpecialRandomOptions & {successMinimum: never, decimal: true | number}): string
	exponentialIncrease (rapidity: number = 1, {max = this.__defaultOptions.max || 1, min = this.__defaultOptions.min || 0, decimal = this.__defaultOptions.decimal, successMinimum = this.__defaultOptions.successMinimum, resetAbove = this.__defaultOptions.resetAbove }: SpecialRandomOptions & {successMinimum?: number, decimal?: true | number} = {}) {
		min = (max - min)*(Math.pow(rapidity*this.__exponentialTries, 2))
		const v = this.r({max, min})
		this.__exponentialTries++
		return decimal ? this.r({max, min, decimal, resetAbove, resetFunc: this.reset.nearing }) : successMinimum ? this.r({max, min, successMinimum, resetAbove, resetFunc: this.reset.nearing }) : this.r({max, min, resetAbove, resetFunc: this.reset.nearing })
		
	}

	/** This will take two formats.If you supply a value that is a array of length 2 with a string that has a string matching a number followed by a % sign, it will provide your value that percentage of the time. Otherwise, it will do a coinflip, providing your value on success and null on failure. */
	ifRand <K extends [any]> (...vals: K): K | null
	ifRand <K extends [any, `${number}%`]> (...vals: K): K[0] | null
	ifRand <K extends [any] | [any, `${number}%`]> (...vals: K): (K[1] extends `${number}%` ? K[0] : K) | null {
		if (vals.length === 1){
			return Math.floor(Math.random() * 2) ? vals[0] : null
		}
		if (vals.length === 2 && typeof vals[1] === 'string' && (vals[1] as string)?.match?.(/%$/) && !Number.isNaN(Number(vals[1].substring(0, vals.length-1)))){
			return Math.floor(Math.random() * 100) < Number(vals[1].substring(0, vals.length-1)) ? vals[0] : null
		}
		return null
	}


	/** this style of randomization allows you to apply a series of arguments in a number of formats, giving you a final outcome randomized between them.
	 * style 1: [any, number] - this is the basic form, where you just provide a value and a number. The number is the weight of the value, and the higher the number, the more likely it is to be chosen.
	 * style 2: any - this is the simplest form, where you just provide a single argument that does not match the other styles. This is the same as providing [any, 1]
	 * style 3: [any, `${number}%`] - this is the most straightforward form, where you just provide a value and a string that ends in a percentage. The result will return the value this percentage of the tim, and the weight style values will be apportioned from the remaining possible percentage.
	 * @example
	 * randomized('a', ['d', 6], ['e', 3], [g, '30%'], ['f', '20%'])
	 * @returns a, d, e, f, or g, with a 20% chance of f, a 30% chance of g, 5% chance of a, 30% chance of d, and 15% chance of e.
	*/
	randomized = <K extends (string | [string, number] | [string, `${number}%`])[]> (...vals: K): RandomizedVals<K> | null => {
		const v: ([string, number ] | [string, `${number}%`])[] = vals.map((val) => {
			return typeof val === 'string' ? [val, 1] as [any, number] : val
		})
		let t = 1;

		const wAndP: [[string, number][], [string, number][]] = v.reduce((split, val) => {
			if (typeof val[1] === 'string'){
				const newVal: [any, number] = [val[0], Number(val[1].substring(0, val[1].length-1))/100]
				t-= newVal[1]
				split[1].push(newVal)
			}
			else {
				split[0].push(val)
			}
			return split
		}, [[], []] as [[string, number][], [string, number][]])

		const per = t/wAndP[0].reduce((a, b) => a+b[1], 0)

		const full = wAndP[1].concat(wAndP[0].map((val) => [val[0], val[1]*per] as [any, number]))

		let rand = Math.random()
		
		full.forEach((val) => {
			if (rand < val[1]){
				return val[0]
			}
			rand -= val[1]
		})
		return null
	}
	
	/** this is a special randomizer that takes an array and then chooses a value from it based on the order of that array. If you wish to force a value in that array to still appear a particular percentage of the time, you can input that value as an array of [<value>, <Number(percentage) | '<percentage>%'>].
	 * @param vals - the array of values to be randomized
	 * @param max - This is the maximum "weight" of the values. Raising this value will make the spread between the percentages of the values more pronounced. @defaultValue 10
	 * @param floor - This is the minimum "weight" of the values. Lowering this value will make the spread between the percentages of the values more pronounced. @defaultValue max/3 || 1
	 * @example
	 * fromOrder(['a', 'b', 'c', 'd', ['e', 30]]) - this will return a 30% chance of e, and then a is most likely, b is less likely, c is less likely than b, d is less likely than c.
	 */
	fromOrder<K extends (string | [string, `${number}%`])[]> (vals: K, max: number, floor: number): RandomizedVals<K> | null
	fromOrder<K extends (string | [string, `${number}%`])[]> (vals: K, max: number): RandomizedVals<K> | null
	fromOrder<K extends (string | [string, `${number}%`])[]> (vals: K): RandomizedVals<K> | null
	fromOrder<K extends (string | [string, `${number}%`])[]> (...vals: K): RandomizedVals<K> | null
	fromOrder<K extends (string | [string, `${number}%`])[]> (...values: K | [K] | (K | number)[]): RandomizedVals<K> | null {
		const [vals, max = 10, floor = max/3 || 1]: [(string | [string, `${number}%`])[], number, number] = values[0] instanceof Array
		? values.length === 1
		|| (values.length === 2 && typeof values[1] === 'number' && !(typeof values[1] === 'string' && (values[1] as string).match(/%$/)))
		|| (values.length === 3 && typeof values[1] === 'number' && typeof values[2] === 'number')
		? values as unknown as [(string | [string, `${number}%`])[], number, number]
		: [values] as unknown as [(string | [string, `${number}%`])[], number, number]
		: [values] as unknown as [(string | [string, `${number}%`])[], number, number]
		const toRand = vals.reduce((arr: (string | [string, number | `${number}%`])[], val, i) => {
		if (max < 1 || max < floor){
			throw new Error('The maximum value must be greater than 1 and greater than the floor value.')
		}
		if (!val){
			return arr;
		}
		arr.push(val instanceof Array 
			? val as [string, `${number}%`]
			: [val, Math.round(((vals.length - i)/vals.length) * (max-floor)) + floor]
			)
			return arr
		}, [])
		return this.randomized<K>(...toRand as K)
	}
}

const boop = new Randomizer({linear: 0, nearing: 0, exponential: 0});
boop.linearIncrease(1, {max: 10, min: 0, successMinimum: 5})

export default Randomizer;
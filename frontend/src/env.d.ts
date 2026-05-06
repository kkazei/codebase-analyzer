
/// <reference types="vite/client" />
import * as React from 'react';
// Fallback JSX namespace for CI environments where @types/react isn't picked up.
// This ensures `tsc` can compile TSX files in the build environment.
declare global {
	namespace JSX {
		// Use React's types where available
		type Element = React.ReactElement;
		interface IntrinsicElements {
			[elemName: string]: any;
		}
	}
}

export {};


import { defineConfig } from 'vite';
export default defineConfig({build:{sourcemap:true,lib:{entry:'src/main.ts',formats:['iife'],name:'WildemountStarterFF'},rollupOptions:{output:{dir:'dist',entryFileNames:'module.js'}}}});

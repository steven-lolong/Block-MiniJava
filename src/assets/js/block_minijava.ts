import * as Blockly from 'blockly';
import '../css/styles.css';
import { startBlockMiniJava } from '../../core/ui/app';

// The existing renderer/generator code expects Blockly on window, matching the browser CDN API.
(window as any).Blockly = Blockly;

startBlockMiniJava();

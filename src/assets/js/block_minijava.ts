import * as Blockly from 'blockly';
import '../css/tokens.css';
import '../css/workbench.css';
import '../css/domain.css';
import '../css/codeEditor.css';
import { startBlockMiniJava } from '../../core/ui/app';

// The existing renderer/generator code expects Blockly on window, matching the browser CDN API.
(window as any).Blockly = Blockly;

startBlockMiniJava();

/* Zhixiang Miao */

import React from 'react';
import '../css/dialog.css';

const Dialog = ({ children, open_dialog }) => {
    if (open_dialog){
        return (
            <div className="dialog">
                {children}
            </div>
        );
    }
    else return null;
};

export default Dialog;
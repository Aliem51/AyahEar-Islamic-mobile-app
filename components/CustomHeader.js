import React from 'react';
import { Button } from 'react-native';


export const LeftHeaderButton = ({ navigation, onPress, ...props }) => {
    return (
        <Button 
            title="<" 
            onPress={onPress || (() => navigation.goBack())} 
            {...props}
        />
    );
}

export const RightHeaderButton = () => {
    return (
        <Button 
            title="🔔" 
            onPress={() => {
                // Добавьте сюда действие для кнопки колокольчика
            }} 
        />
    );
}

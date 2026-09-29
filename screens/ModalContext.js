import React, { createContext, useState, useContext } from 'react';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
    const [isModalVisible, setModalVisible] = useState(false);
    const toggleModal = () => setModalVisible(!isModalVisible);

    return (
        <ModalContext.Provider value={{ isModalVisible, setModalVisible, toggleModal }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    return useContext(ModalContext);
};

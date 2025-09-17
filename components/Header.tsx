// Fix: Implement a simple Header component for the application.
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-white shadow-md p-4 mb-8">
            <div className="container mx-auto flex items-center justify-center md:justify-start">
                <h1 className="text-3xl font-bold text-blue-600 text-center md:text-left">
                    Umbrella
                </h1>
            </div>
        </header>
    );
};

export default Header;
export interface MiniJavaExample {
  id: string;
  label: string;
  description: string;
  state: Record<string, unknown>;
}

export const MINI_JAVA_EXAMPLES: MiniJavaExample[] = [
  {
    id: 'factorial',
    label: 'Factorial',
    description: 'Recursive MiniJava factorial program: ComputeFac(10) prints 3628800',
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'mj_goal',
            x: 48,
            y: 48,
            deletable: false,
            movable: false,
            inputs: {
              MAIN: {
                block: {
                  type: 'mj_main_class',
                  fields: {
                    CLASS: 'Factorial',
                    ARG: 'a'
                  },
                  inputs: {
                    STATEMENT: {
                      block: {
                        type: 'mj_statement_print',
                        inputs: {
                          VALUE: {
                            block: {
                              type: 'mj_expr_method_call',
                              fields: {
                                METHOD: 'ComputeFac'
                              },
                              inputs: {
                                OBJECT: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: {
                                      CLASS: 'Fac'
                                    }
                                  }
                                },
                                ARGS: {
                                  block: {
                                    type: 'mj_argument_item',
                                    inputs: {
                                      EXPR: {
                                        block: {
                                          type: 'mj_expr_integer',
                                          fields: {
                                            VALUE: 10
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              CLASSES: {
                block: {
                  type: 'mj_class_declaration',
                  fields: {
                    CLASS: 'Fac',
                    HAS_EXTENDS: 'FALSE'
                  },
                  inputs: {
                    METHODS: {
                      block: {
                        type: 'mj_method_declaration',
                        fields: {
                          NAME: 'ComputeFac'
                        },
                        inputs: {
                          TYPE: {
                            block: {
                              type: 'mj_type_int'
                            }
                          },
                          PARAMS: {
                            block: {
                              type: 'mj_formal_parameter',
                              fields: {
                                NAME: 'num'
                              },
                              inputs: {
                                TYPE: {
                                  block: {
                                    type: 'mj_type_int'
                                  }
                                }
                              }
                            }
                          },
                          VARS: {
                            block: {
                              type: 'mj_var_declaration',
                              fields: {
                                NAME: 'num_aux'
                              },
                              inputs: {
                                TYPE: {
                                  block: {
                                    type: 'mj_type_int'
                                  }
                                }
                              }
                            }
                          },
                          BODY: {
                            block: {
                              type: 'mj_statement_if',
                              inputs: {
                                COND: {
                                  block: {
                                    type: 'mj_expr_compare',
                                    fields: {
                                      OP: '<'
                                    },
                                    inputs: {
                                      LEFT: {
                                        block: {
                                          type: 'mj_expr_identifier',
                                          fields: {
                                            NAME: 'num'
                                          }
                                        }
                                      },
                                      RIGHT: {
                                        block: {
                                          type: 'mj_expr_integer',
                                          fields: {
                                            VALUE: 1
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                THEN: {
                                  block: {
                                    type: 'mj_statement_assign',
                                    fields: {
                                      NAME: 'num_aux'
                                    },
                                    inputs: {
                                      VALUE: {
                                        block: {
                                          type: 'mj_expr_integer',
                                          fields: {
                                            VALUE: 1
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                ELSE: {
                                  block: {
                                    type: 'mj_statement_assign',
                                    fields: {
                                      NAME: 'num_aux'
                                    },
                                    inputs: {
                                      VALUE: {
                                        block: {
                                          type: 'mj_expr_arith',
                                          fields: {
                                            OP: '*'
                                          },
                                          inputs: {
                                            LEFT: {
                                              block: {
                                                type: 'mj_expr_identifier',
                                                fields: {
                                                  NAME: 'num'
                                                }
                                              }
                                            },
                                            RIGHT: {
                                              block: {
                                                type: 'mj_expr_method_call',
                                                fields: {
                                                  METHOD: 'ComputeFac'
                                                },
                                                inputs: {
                                                  OBJECT: {
                                                    block: {
                                                      type: 'mj_expr_this'
                                                    }
                                                  },
                                                  ARGS: {
                                                    block: {
                                                      type: 'mj_argument_item',
                                                      inputs: {
                                                        EXPR: {
                                                          block: {
                                                            type: 'mj_expr_arith',
                                                            fields: {
                                                              OP: '-'
                                                            },
                                                            inputs: {
                                                              LEFT: {
                                                                block: {
                                                                  type: 'mj_expr_identifier',
                                                                  fields: {
                                                                    NAME: 'num'
                                                                  }
                                                                }
                                                              },
                                                              RIGHT: {
                                                                block: {
                                                                  type: 'mj_expr_integer',
                                                                  fields: {
                                                                    VALUE: 1
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          RETURN: {
                            block: {
                              type: 'mj_expr_identifier',
                              fields: {
                                NAME: 'num_aux'
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    }
  },
  {
    id: 'binary-search',
    label: 'Binary Search',
    description: 'Classic MiniJava binary search over a 20-element sorted array; prints 1 (8 found), 0 (19 absent), 0 — under Model B the init writes never reach the caller, so it prints 0, 0, 0 instead',
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'mj_goal',
            x: 48,
            y: 48,
            deletable: false,
            movable: false,
            inputs: {
              MAIN: {
                block: {
                  type: 'mj_main_class',
                  fields: {
                    CLASS: 'BinarySearch',
                    ARG: 'a'
                  },
                  inputs: {
                    STATEMENT: {
                      block: {
                        type: 'mj_statement_print',
                        inputs: {
                          VALUE: {
                            block: {
                              type: 'mj_expr_method_call',
                              fields: {
                                METHOD: 'Start'
                              },
                              inputs: {
                                OBJECT: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: {
                                      CLASS: 'BS'
                                    }
                                  }
                                },
                                ARGS: {
                                  block: {
                                    type: 'mj_argument_item',
                                    inputs: {
                                      EXPR: {
                                        block: {
                                          type: 'mj_expr_integer',
                                          fields: {
                                            VALUE: 20
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              CLASSES: {
                block: {
                  type: 'mj_class_declaration',
                  fields: {
                    CLASS: 'BS',
                    HAS_EXTENDS: 'FALSE'
                  },
                  inputs: {
                    VARS: {
                      block: {
                        type: 'mj_var_declaration',
                        fields: {
                          NAME: 'number'
                        },
                        inputs: {
                          TYPE: {
                            block: {
                              type: 'mj_type_int_array'
                            }
                          }
                        },
                        next: {
                          block: {
                            type: 'mj_var_declaration',
                            fields: {
                              NAME: 'size'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_int'
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    METHODS: {
                      block: {
                        type: 'mj_method_declaration',
                        fields: {
                          NAME: 'Start'
                        },
                        inputs: {
                          TYPE: {
                            block: {
                              type: 'mj_type_int'
                            }
                          },
                          PARAMS: {
                            block: {
                              type: 'mj_formal_parameter',
                              fields: {
                                NAME: 'sz'
                              },
                              inputs: {
                                TYPE: {
                                  block: {
                                    type: 'mj_type_int'
                                  }
                                }
                              }
                            }
                          },
                          VARS: {
                            block: {
                              type: 'mj_var_declaration',
                              fields: {
                                NAME: 'aux'
                              },
                              inputs: {
                                TYPE: {
                                  block: {
                                    type: 'mj_type_int'
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'mj_var_declaration',
                                  fields: {
                                    NAME: 'searchResult'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_int'
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          BODY: {
                            block: {
                              type: 'mj_statement_assign',
                              fields: {
                                NAME: 'aux'
                              },
                              inputs: {
                                VALUE: {
                                  block: {
                                    type: 'mj_expr_method_call',
                                    fields: {
                                      METHOD: 'Init'
                                    },
                                    inputs: {
                                      OBJECT: {
                                        block: {
                                          type: 'mj_expr_this'
                                        }
                                      },
                                      ARGS: {
                                        block: {
                                          type: 'mj_argument_item',
                                          inputs: {
                                            EXPR: {
                                              block: {
                                                type: 'mj_expr_identifier',
                                                fields: {
                                                  NAME: 'sz'
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'mj_statement_assign',
                                  fields: {
                                    NAME: 'searchResult'
                                  },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'mj_expr_method_call',
                                        fields: {
                                          METHOD: 'Search'
                                        },
                                        inputs: {
                                          OBJECT: {
                                            block: {
                                              type: 'mj_expr_this'
                                            }
                                          },
                                          ARGS: {
                                            block: {
                                              type: 'mj_argument_item',
                                              inputs: {
                                                EXPR: {
                                                  block: {
                                                    type: 'mj_expr_integer',
                                                    fields: {
                                                      VALUE: 8
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'mj_statement_print',
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: 'mj_expr_identifier',
                                            fields: {
                                              NAME: 'searchResult'
                                            }
                                          }
                                        }
                                      },
                                      next: {
                                        block: {
                                          type: 'mj_statement_assign',
                                          fields: {
                                            NAME: 'searchResult'
                                          },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: 'mj_expr_method_call',
                                                fields: {
                                                  METHOD: 'Search'
                                                },
                                                inputs: {
                                                  OBJECT: {
                                                    block: {
                                                      type: 'mj_expr_this'
                                                    }
                                                  },
                                                  ARGS: {
                                                    block: {
                                                      type: 'mj_argument_item',
                                                      inputs: {
                                                        EXPR: {
                                                          block: {
                                                            type: 'mj_expr_integer',
                                                            fields: {
                                                              VALUE: 19
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          },
                                          next: {
                                            block: {
                                              type: 'mj_statement_print',
                                              inputs: {
                                                VALUE: {
                                                  block: {
                                                    type: 'mj_expr_identifier',
                                                    fields: {
                                                      NAME: 'searchResult'
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          RETURN: {
                            block: {
                              type: 'mj_expr_integer',
                              fields: {
                                VALUE: 0
                              }
                            }
                          }
                        },
                        next: {
                          block: {
                            type: 'mj_method_declaration',
                            fields: {
                              NAME: 'Search'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_int'
                                }
                              },
                              PARAMS: {
                                block: {
                                  type: 'mj_formal_parameter',
                                  fields: {
                                    NAME: 'num'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_int'
                                      }
                                    }
                                  }
                                }
                              },
                              VARS: {
                                block: {
                                  type: 'mj_var_declaration',
                                  fields: {
                                    NAME: 'l'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_int'
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'mj_var_declaration',
                                      fields: {
                                        NAME: 'h'
                                      },
                                      inputs: {
                                        TYPE: {
                                          block: {
                                            type: 'mj_type_int'
                                          }
                                        }
                                      },
                                      next: {
                                        block: {
                                          type: 'mj_var_declaration',
                                          fields: {
                                            NAME: 'mid'
                                          },
                                          inputs: {
                                            TYPE: {
                                              block: {
                                                type: 'mj_type_int'
                                              }
                                            }
                                          },
                                          next: {
                                            block: {
                                              type: 'mj_var_declaration',
                                              fields: {
                                                NAME: 'found'
                                              },
                                              inputs: {
                                                TYPE: {
                                                  block: {
                                                    type: 'mj_type_int'
                                                  }
                                                }
                                              },
                                              next: {
                                                block: {
                                                  type: 'mj_var_declaration',
                                                  fields: {
                                                    NAME: 'var_test'
                                                  },
                                                  inputs: {
                                                    TYPE: {
                                                      block: {
                                                        type: 'mj_type_int'
                                                      }
                                                    }
                                                  },
                                                  next: {
                                                    block: {
                                                      type: 'mj_var_declaration',
                                                      fields: {
                                                        NAME: 'keep_looking'
                                                      },
                                                      inputs: {
                                                        TYPE: {
                                                          block: {
                                                            type: 'mj_type_boolean'
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              BODY: {
                                block: {
                                  type: 'mj_statement_assign',
                                  fields: {
                                    NAME: 'l'
                                  },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'mj_expr_integer',
                                        fields: {
                                          VALUE: 0
                                        }
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'mj_statement_assign',
                                      fields: {
                                        NAME: 'h'
                                      },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: 'mj_expr_arith',
                                            fields: {
                                              OP: '-'
                                            },
                                            inputs: {
                                              LEFT: {
                                                block: {
                                                  type: 'mj_expr_identifier',
                                                  fields: {
                                                    NAME: 'size'
                                                  }
                                                }
                                              },
                                              RIGHT: {
                                                block: {
                                                  type: 'mj_expr_integer',
                                                  fields: {
                                                    VALUE: 1
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      },
                                      next: {
                                        block: {
                                          type: 'mj_statement_assign',
                                          fields: {
                                            NAME: 'found'
                                          },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: 'mj_expr_integer',
                                                fields: {
                                                  VALUE: 0
                                                }
                                              }
                                            }
                                          },
                                          next: {
                                            block: {
                                              type: 'mj_statement_assign',
                                              fields: {
                                                NAME: 'keep_looking'
                                              },
                                              inputs: {
                                                VALUE: {
                                                  block: {
                                                    type: 'mj_expr_boolean',
                                                    fields: {
                                                      VALUE: 'true'
                                                    }
                                                  }
                                                }
                                              },
                                              next: {
                                                block: {
                                                  type: 'mj_statement_while',
                                                  inputs: {
                                                    COND: {
                                                      block: {
                                                        type: 'mj_expr_identifier',
                                                        fields: {
                                                          NAME: 'keep_looking'
                                                        }
                                                      }
                                                    },
                                                    BODY: {
                                                      block: {
                                                        type: 'mj_statement_if',
                                                        inputs: {
                                                          COND: {
                                                            block: {
                                                              type: 'mj_expr_compare',
                                                              fields: {
                                                                OP: '<'
                                                              },
                                                              inputs: {
                                                                LEFT: {
                                                                  block: {
                                                                    type: 'mj_expr_identifier',
                                                                    fields: {
                                                                      NAME: 'h'
                                                                    }
                                                                  }
                                                                },
                                                                RIGHT: {
                                                                  block: {
                                                                    type: 'mj_expr_identifier',
                                                                    fields: {
                                                                      NAME: 'l'
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          },
                                                          THEN: {
                                                            block: {
                                                              type: 'mj_statement_assign',
                                                              fields: {
                                                                NAME: 'keep_looking'
                                                              },
                                                              inputs: {
                                                                VALUE: {
                                                                  block: {
                                                                    type: 'mj_expr_boolean',
                                                                    fields: {
                                                                      VALUE: 'false'
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          },
                                                          ELSE: {
                                                            block: {
                                                              type: 'mj_statement_assign',
                                                              fields: {
                                                                NAME: 'mid'
                                                              },
                                                              inputs: {
                                                                VALUE: {
                                                                  block: {
                                                                    type: 'mj_expr_arith',
                                                                    fields: {
                                                                      OP: '/'
                                                                    },
                                                                    inputs: {
                                                                      LEFT: {
                                                                        block: {
                                                                          type: 'mj_expr_arith',
                                                                          fields: {
                                                                            OP: '+'
                                                                          },
                                                                          inputs: {
                                                                            LEFT: {
                                                                              block: {
                                                                                type: 'mj_expr_identifier',
                                                                                fields: {
                                                                                  NAME: 'l'
                                                                                }
                                                                              }
                                                                            },
                                                                            RIGHT: {
                                                                              block: {
                                                                                type: 'mj_expr_identifier',
                                                                                fields: {
                                                                                  NAME: 'h'
                                                                                }
                                                                              }
                                                                            }
                                                                          }
                                                                        }
                                                                      },
                                                                      RIGHT: {
                                                                        block: {
                                                                          type: 'mj_expr_integer',
                                                                          fields: {
                                                                            VALUE: 2
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              },
                                                              next: {
                                                                block: {
                                                                  type: 'mj_statement_assign',
                                                                  fields: {
                                                                    NAME: 'var_test'
                                                                  },
                                                                  inputs: {
                                                                    VALUE: {
                                                                      block: {
                                                                        type: 'mj_expr_array_lookup',
                                                                        inputs: {
                                                                          ARRAY: {
                                                                            block: {
                                                                              type: 'mj_expr_identifier',
                                                                              fields: {
                                                                                NAME: 'number'
                                                                              }
                                                                            }
                                                                          },
                                                                          INDEX: {
                                                                            block: {
                                                                              type: 'mj_expr_identifier',
                                                                              fields: {
                                                                                NAME: 'mid'
                                                                              }
                                                                            }
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  },
                                                                  next: {
                                                                    block: {
                                                                      type: 'mj_statement_if',
                                                                      inputs: {
                                                                        COND: {
                                                                          block: {
                                                                            type: 'mj_expr_compare',
                                                                            fields: {
                                                                              OP: '<'
                                                                            },
                                                                            inputs: {
                                                                              LEFT: {
                                                                                block: {
                                                                                  type: 'mj_expr_identifier',
                                                                                  fields: {
                                                                                    NAME: 'num'
                                                                                  }
                                                                                }
                                                                              },
                                                                              RIGHT: {
                                                                                block: {
                                                                                  type: 'mj_expr_identifier',
                                                                                  fields: {
                                                                                    NAME: 'var_test'
                                                                                  }
                                                                                }
                                                                              }
                                                                            }
                                                                          }
                                                                        },
                                                                        THEN: {
                                                                          block: {
                                                                            type: 'mj_statement_assign',
                                                                            fields: {
                                                                              NAME: 'h'
                                                                            },
                                                                            inputs: {
                                                                              VALUE: {
                                                                                block: {
                                                                                  type: 'mj_expr_arith',
                                                                                  fields: {
                                                                                    OP: '-'
                                                                                  },
                                                                                  inputs: {
                                                                                    LEFT: {
                                                                                      block: {
                                                                                        type: 'mj_expr_identifier',
                                                                                        fields: {
                                                                                          NAME: 'mid'
                                                                                        }
                                                                                      }
                                                                                    },
                                                                                    RIGHT: {
                                                                                      block: {
                                                                                        type: 'mj_expr_integer',
                                                                                        fields: {
                                                                                          VALUE: 1
                                                                                        }
                                                                                      }
                                                                                    }
                                                                                  }
                                                                                }
                                                                              }
                                                                            }
                                                                          }
                                                                        },
                                                                        ELSE: {
                                                                          block: {
                                                                            type: 'mj_statement_if',
                                                                            inputs: {
                                                                              COND: {
                                                                                block: {
                                                                                  type: 'mj_expr_compare',
                                                                                  fields: {
                                                                                    OP: '<'
                                                                                  },
                                                                                  inputs: {
                                                                                    LEFT: {
                                                                                      block: {
                                                                                        type: 'mj_expr_identifier',
                                                                                        fields: {
                                                                                          NAME: 'var_test'
                                                                                        }
                                                                                      }
                                                                                    },
                                                                                    RIGHT: {
                                                                                      block: {
                                                                                        type: 'mj_expr_identifier',
                                                                                        fields: {
                                                                                          NAME: 'num'
                                                                                        }
                                                                                      }
                                                                                    }
                                                                                  }
                                                                                }
                                                                              },
                                                                              THEN: {
                                                                                block: {
                                                                                  type: 'mj_statement_assign',
                                                                                  fields: {
                                                                                    NAME: 'l'
                                                                                  },
                                                                                  inputs: {
                                                                                    VALUE: {
                                                                                      block: {
                                                                                        type: 'mj_expr_arith',
                                                                                        fields: {
                                                                                          OP: '+'
                                                                                        },
                                                                                        inputs: {
                                                                                          LEFT: {
                                                                                            block: {
                                                                                              type: 'mj_expr_identifier',
                                                                                              fields: {
                                                                                                NAME: 'mid'
                                                                                              }
                                                                                            }
                                                                                          },
                                                                                          RIGHT: {
                                                                                            block: {
                                                                                              type: 'mj_expr_integer',
                                                                                              fields: {
                                                                                                VALUE: 1
                                                                                              }
                                                                                            }
                                                                                          }
                                                                                        }
                                                                                      }
                                                                                    }
                                                                                  }
                                                                                }
                                                                              },
                                                                              ELSE: {
                                                                                block: {
                                                                                  type: 'mj_statement_assign',
                                                                                  fields: {
                                                                                    NAME: 'found'
                                                                                  },
                                                                                  inputs: {
                                                                                    VALUE: {
                                                                                      block: {
                                                                                        type: 'mj_expr_integer',
                                                                                        fields: {
                                                                                          VALUE: 1
                                                                                        }
                                                                                      }
                                                                                    }
                                                                                  },
                                                                                  next: {
                                                                                    block: {
                                                                                      type: 'mj_statement_assign',
                                                                                      fields: {
                                                                                        NAME: 'keep_looking'
                                                                                      },
                                                                                      inputs: {
                                                                                        VALUE: {
                                                                                          block: {
                                                                                            type: 'mj_expr_boolean',
                                                                                            fields: {
                                                                                              VALUE: 'false'
                                                                                            }
                                                                                          }
                                                                                        }
                                                                                      }
                                                                                    }
                                                                                  }
                                                                                }
                                                                              }
                                                                            }
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              RETURN: {
                                block: {
                                  type: 'mj_expr_identifier',
                                  fields: {
                                    NAME: 'found'
                                  }
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'mj_method_declaration',
                                fields: {
                                  NAME: 'Init'
                                },
                                inputs: {
                                  TYPE: {
                                    block: {
                                      type: 'mj_type_int'
                                    }
                                  },
                                  PARAMS: {
                                    block: {
                                      type: 'mj_formal_parameter',
                                      fields: {
                                        NAME: 'sz'
                                      },
                                      inputs: {
                                        TYPE: {
                                          block: {
                                            type: 'mj_type_int'
                                          }
                                        }
                                      }
                                    }
                                  },
                                  VARS: {
                                    block: {
                                      type: 'mj_var_declaration',
                                      fields: {
                                        NAME: 'i'
                                      },
                                      inputs: {
                                        TYPE: {
                                          block: {
                                            type: 'mj_type_int'
                                          }
                                        }
                                      }
                                    }
                                  },
                                  BODY: {
                                    block: {
                                      type: 'mj_statement_assign',
                                      fields: {
                                        NAME: 'size'
                                      },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: 'mj_expr_identifier',
                                            fields: {
                                              NAME: 'sz'
                                            }
                                          }
                                        }
                                      },
                                      next: {
                                        block: {
                                          type: 'mj_statement_assign',
                                          fields: {
                                            NAME: 'number'
                                          },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: 'mj_expr_new_int_array',
                                                inputs: {
                                                  SIZE: {
                                                    block: {
                                                      type: 'mj_expr_identifier',
                                                      fields: {
                                                        NAME: 'sz'
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          },
                                          next: {
                                            block: {
                                              type: 'mj_statement_assign',
                                              fields: {
                                                NAME: 'i'
                                              },
                                              inputs: {
                                                VALUE: {
                                                  block: {
                                                    type: 'mj_expr_integer',
                                                    fields: {
                                                      VALUE: 0
                                                    }
                                                  }
                                                }
                                              },
                                              next: {
                                                block: {
                                                  type: 'mj_statement_while',
                                                  inputs: {
                                                    COND: {
                                                      block: {
                                                        type: 'mj_expr_compare',
                                                        fields: {
                                                          OP: '<'
                                                        },
                                                        inputs: {
                                                          LEFT: {
                                                            block: {
                                                              type: 'mj_expr_identifier',
                                                              fields: {
                                                                NAME: 'i'
                                                              }
                                                            }
                                                          },
                                                          RIGHT: {
                                                            block: {
                                                              type: 'mj_expr_identifier',
                                                              fields: {
                                                                NAME: 'size'
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    },
                                                    BODY: {
                                                      block: {
                                                        type: 'mj_statement_array_assign',
                                                        fields: {
                                                          NAME: 'number'
                                                        },
                                                        inputs: {
                                                          INDEX: {
                                                            block: {
                                                              type: 'mj_expr_identifier',
                                                              fields: {
                                                                NAME: 'i'
                                                              }
                                                            }
                                                          },
                                                          VALUE: {
                                                            block: {
                                                              type: 'mj_expr_arith',
                                                              fields: {
                                                                OP: '*'
                                                              },
                                                              inputs: {
                                                                LEFT: {
                                                                  block: {
                                                                    type: 'mj_expr_identifier',
                                                                    fields: {
                                                                      NAME: 'i'
                                                                    }
                                                                  }
                                                                },
                                                                RIGHT: {
                                                                  block: {
                                                                    type: 'mj_expr_integer',
                                                                    fields: {
                                                                      VALUE: 2
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        },
                                                        next: {
                                                          block: {
                                                            type: 'mj_statement_assign',
                                                            fields: {
                                                              NAME: 'i'
                                                            },
                                                            inputs: {
                                                              VALUE: {
                                                                block: {
                                                                  type: 'mj_expr_arith',
                                                                  fields: {
                                                                    OP: '+'
                                                                  },
                                                                  inputs: {
                                                                    LEFT: {
                                                                      block: {
                                                                        type: 'mj_expr_identifier',
                                                                        fields: {
                                                                          NAME: 'i'
                                                                        }
                                                                      }
                                                                    },
                                                                    RIGHT: {
                                                                      block: {
                                                                        type: 'mj_expr_integer',
                                                                        fields: {
                                                                          VALUE: 1
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  },
                                  RETURN: {
                                    block: {
                                      type: 'mj_expr_integer',
                                      fields: {
                                        VALUE: 0
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    }
  },
  {
    id: 'shapes',
    label: 'Shapes (Inheritance)',
    description: 'extends and dynamic dispatch: a Rectangle in a Shape variable prints 50, not 0 — then 336 for the bordered area; under Model B the init writes never reach the caller, so it prints 0, 0, 0',
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'mj_goal',
            x: 48,
            y: 48,
            deletable: false,
            movable: false,
            inputs: {
              MAIN: {
                block: {
                  type: 'mj_main_class',
                  fields: {
                    CLASS: 'Shapes',
                    ARG: 'a'
                  },
                  inputs: {
                    STATEMENT: {
                      block: {
                        type: 'mj_statement_print',
                        inputs: {
                          VALUE: {
                            block: {
                              type: 'mj_expr_method_call',
                              fields: {
                                METHOD: 'Run'
                              },
                              inputs: {
                                OBJECT: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: {
                                      CLASS: 'Setup'
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              CLASSES: {
                block: {
                  type: 'mj_class_declaration',
                  fields: {
                    CLASS: 'Setup',
                    HAS_EXTENDS: 'FALSE'
                  },
                  inputs: {
                    METHODS: {
                      block: {
                        type: 'mj_method_declaration',
                        fields: {
                          NAME: 'Run'
                        },
                        inputs: {
                          TYPE: {
                            block: {
                              type: 'mj_type_int'
                            }
                          },
                          VARS: {
                            block: {
                              type: 'mj_var_declaration',
                              fields: {
                                NAME: 's1'
                              },
                              inputs: {
                                TYPE: {
                                  block: {
                                    type: 'mj_type_identifier',
                                    fields: {
                                      NAME: 'Shape'
                                    }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'mj_var_declaration',
                                  fields: {
                                    NAME: 's2'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_identifier',
                                        fields: {
                                          NAME: 'Shape'
                                        }
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'mj_var_declaration',
                                      fields: {
                                        NAME: 'r'
                                      },
                                      inputs: {
                                        TYPE: {
                                          block: {
                                            type: 'mj_type_identifier',
                                            fields: {
                                              NAME: 'Rectangle'
                                            }
                                          }
                                        }
                                      },
                                      next: {
                                        block: {
                                          type: 'mj_var_declaration',
                                          fields: {
                                            NAME: 'aux'
                                          },
                                          inputs: {
                                            TYPE: {
                                              block: {
                                                type: 'mj_type_int'
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          BODY: {
                            block: {
                              type: 'mj_statement_assign',
                              fields: {
                                NAME: 's1'
                              },
                              inputs: {
                                VALUE: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: {
                                      CLASS: 'Shape'
                                    }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'mj_statement_assign',
                                  fields: {
                                    NAME: 's2'
                                  },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'mj_expr_new_object',
                                        fields: {
                                          CLASS: 'Rectangle'
                                        }
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'mj_statement_assign',
                                      fields: {
                                        NAME: 'r'
                                      },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: 'mj_expr_new_object',
                                            fields: {
                                              CLASS: 'Rectangle'
                                            }
                                          }
                                        }
                                      },
                                      next: {
                                        block: {
                                          type: 'mj_statement_assign',
                                          fields: {
                                            NAME: 'aux'
                                          },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: 'mj_expr_method_call',
                                                fields: {
                                                  METHOD: 'Init'
                                                },
                                                inputs: {
                                                  OBJECT: {
                                                    block: {
                                                      type: 'mj_expr_identifier',
                                                      fields: {
                                                        NAME: 's1'
                                                      }
                                                    }
                                                  },
                                                  ARGS: {
                                                    block: {
                                                      type: 'mj_argument_item',
                                                      inputs: {
                                                        EXPR: {
                                                          block: {
                                                            type: 'mj_expr_integer',
                                                            fields: {
                                                              VALUE: 5
                                                            }
                                                          }
                                                        }
                                                      },
                                                      next: {
                                                        block: {
                                                          type: 'mj_argument_item',
                                                          inputs: {
                                                            EXPR: {
                                                              block: {
                                                                type: 'mj_expr_integer',
                                                                fields: {
                                                                  VALUE: 10
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          },
                                          next: {
                                            block: {
                                              type: 'mj_statement_print',
                                              inputs: {
                                                VALUE: {
                                                  block: {
                                                    type: 'mj_expr_method_call',
                                                    fields: {
                                                      METHOD: 'GetArea'
                                                    },
                                                    inputs: {
                                                      OBJECT: {
                                                        block: {
                                                          type: 'mj_expr_identifier',
                                                          fields: {
                                                            NAME: 's1'
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              },
                                              next: {
                                                block: {
                                                  type: 'mj_statement_assign',
                                                  fields: {
                                                    NAME: 'aux'
                                                  },
                                                  inputs: {
                                                    VALUE: {
                                                      block: {
                                                        type: 'mj_expr_method_call',
                                                        fields: {
                                                          METHOD: 'Init'
                                                        },
                                                        inputs: {
                                                          OBJECT: {
                                                            block: {
                                                              type: 'mj_expr_identifier',
                                                              fields: {
                                                                NAME: 's2'
                                                              }
                                                            }
                                                          },
                                                          ARGS: {
                                                            block: {
                                                              type: 'mj_argument_item',
                                                              inputs: {
                                                                EXPR: {
                                                                  block: {
                                                                    type: 'mj_expr_integer',
                                                                    fields: {
                                                                      VALUE: 5
                                                                    }
                                                                  }
                                                                }
                                                              },
                                                              next: {
                                                                block: {
                                                                  type: 'mj_argument_item',
                                                                  inputs: {
                                                                    EXPR: {
                                                                      block: {
                                                                        type: 'mj_expr_integer',
                                                                        fields: {
                                                                          VALUE: 10
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  },
                                                  next: {
                                                    block: {
                                                      type: 'mj_statement_print',
                                                      inputs: {
                                                        VALUE: {
                                                          block: {
                                                            type: 'mj_expr_method_call',
                                                            fields: {
                                                              METHOD: 'GetArea'
                                                            },
                                                            inputs: {
                                                              OBJECT: {
                                                                block: {
                                                                  type: 'mj_expr_identifier',
                                                                  fields: {
                                                                    NAME: 's2'
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      },
                                                      next: {
                                                        block: {
                                                          type: 'mj_statement_assign',
                                                          fields: {
                                                            NAME: 'aux'
                                                          },
                                                          inputs: {
                                                            VALUE: {
                                                              block: {
                                                                type: 'mj_expr_method_call',
                                                                fields: {
                                                                  METHOD: 'Init'
                                                                },
                                                                inputs: {
                                                                  OBJECT: {
                                                                    block: {
                                                                      type: 'mj_expr_identifier',
                                                                      fields: {
                                                                        NAME: 'r'
                                                                      }
                                                                    }
                                                                  },
                                                                  ARGS: {
                                                                    block: {
                                                                      type: 'mj_argument_item',
                                                                      inputs: {
                                                                        EXPR: {
                                                                          block: {
                                                                            type: 'mj_expr_integer',
                                                                            fields: {
                                                                              VALUE: 10
                                                                            }
                                                                          }
                                                                        }
                                                                      },
                                                                      next: {
                                                                        block: {
                                                                          type: 'mj_argument_item',
                                                                          inputs: {
                                                                            EXPR: {
                                                                              block: {
                                                                                type: 'mj_expr_integer',
                                                                                fields: {
                                                                                  VALUE: 20
                                                                                }
                                                                              }
                                                                            }
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          },
                                                          next: {
                                                            block: {
                                                              type: 'mj_statement_assign',
                                                              fields: {
                                                                NAME: 'aux'
                                                              },
                                                              inputs: {
                                                                VALUE: {
                                                                  block: {
                                                                    type: 'mj_expr_method_call',
                                                                    fields: {
                                                                      METHOD: 'SetBorder'
                                                                    },
                                                                    inputs: {
                                                                      OBJECT: {
                                                                        block: {
                                                                          type: 'mj_expr_identifier',
                                                                          fields: {
                                                                            NAME: 'r'
                                                                          }
                                                                        }
                                                                      },
                                                                      ARGS: {
                                                                        block: {
                                                                          type: 'mj_argument_item',
                                                                          inputs: {
                                                                            EXPR: {
                                                                              block: {
                                                                                type: 'mj_expr_integer',
                                                                                fields: {
                                                                                  VALUE: 2
                                                                                }
                                                                              }
                                                                            }
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              },
                                                              next: {
                                                                block: {
                                                                  type: 'mj_statement_print',
                                                                  inputs: {
                                                                    VALUE: {
                                                                      block: {
                                                                        type: 'mj_expr_method_call',
                                                                        fields: {
                                                                          METHOD: 'GetAreaWithBorder'
                                                                        },
                                                                        inputs: {
                                                                          OBJECT: {
                                                                            block: {
                                                                              type: 'mj_expr_identifier',
                                                                              fields: {
                                                                                NAME: 'r'
                                                                              }
                                                                            }
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          RETURN: {
                            block: {
                              type: 'mj_expr_integer',
                              fields: {
                                VALUE: 0
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'mj_class_declaration',
                      fields: {
                        CLASS: 'Shape',
                        HAS_EXTENDS: 'FALSE'
                      },
                      inputs: {
                        VARS: {
                          block: {
                            type: 'mj_var_declaration',
                            fields: {
                              NAME: 'width'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_int'
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'mj_var_declaration',
                                fields: {
                                  NAME: 'height'
                                },
                                inputs: {
                                  TYPE: {
                                    block: {
                                      type: 'mj_type_int'
                                    }
                                  }
                                }
                              }
                            }
                          }
                        },
                        METHODS: {
                          block: {
                            type: 'mj_method_declaration',
                            fields: {
                              NAME: 'Init'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_int'
                                }
                              },
                              PARAMS: {
                                block: {
                                  type: 'mj_formal_parameter',
                                  fields: {
                                    NAME: 'w'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_int'
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'mj_formal_parameter',
                                      fields: {
                                        NAME: 'h'
                                      },
                                      inputs: {
                                        TYPE: {
                                          block: {
                                            type: 'mj_type_int'
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              BODY: {
                                block: {
                                  type: 'mj_statement_assign',
                                  fields: {
                                    NAME: 'width'
                                  },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'mj_expr_identifier',
                                        fields: {
                                          NAME: 'w'
                                        }
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'mj_statement_assign',
                                      fields: {
                                        NAME: 'height'
                                      },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: 'mj_expr_identifier',
                                            fields: {
                                              NAME: 'h'
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              RETURN: {
                                block: {
                                  type: 'mj_expr_integer',
                                  fields: {
                                    VALUE: 0
                                  }
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'mj_method_declaration',
                                fields: {
                                  NAME: 'GetArea'
                                },
                                inputs: {
                                  TYPE: {
                                    block: {
                                      type: 'mj_type_int'
                                    }
                                  },
                                  RETURN: {
                                    block: {
                                      type: 'mj_expr_integer',
                                      fields: {
                                        VALUE: 0
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      next: {
                        block: {
                          type: 'mj_class_declaration',
                          fields: {
                            CLASS: 'Rectangle',
                            HAS_EXTENDS: 'TRUE',
                            PARENT: 'Shape'
                          },
                          inputs: {
                            VARS: {
                              block: {
                                type: 'mj_var_declaration',
                                fields: {
                                  NAME: 'borderWidth'
                                },
                                inputs: {
                                  TYPE: {
                                    block: {
                                      type: 'mj_type_int'
                                    }
                                  }
                                }
                              }
                            },
                            METHODS: {
                              block: {
                                type: 'mj_method_declaration',
                                fields: {
                                  NAME: 'GetArea'
                                },
                                inputs: {
                                  TYPE: {
                                    block: {
                                      type: 'mj_type_int'
                                    }
                                  },
                                  RETURN: {
                                    block: {
                                      type: 'mj_expr_arith',
                                      fields: {
                                        OP: '*'
                                      },
                                      inputs: {
                                        LEFT: {
                                          block: {
                                            type: 'mj_expr_identifier',
                                            fields: {
                                              NAME: 'width'
                                            }
                                          }
                                        },
                                        RIGHT: {
                                          block: {
                                            type: 'mj_expr_identifier',
                                            fields: {
                                              NAME: 'height'
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                next: {
                                  block: {
                                    type: 'mj_method_declaration',
                                    fields: {
                                      NAME: 'SetBorder'
                                    },
                                    inputs: {
                                      TYPE: {
                                        block: {
                                          type: 'mj_type_int'
                                        }
                                      },
                                      PARAMS: {
                                        block: {
                                          type: 'mj_formal_parameter',
                                          fields: {
                                            NAME: 'b'
                                          },
                                          inputs: {
                                            TYPE: {
                                              block: {
                                                type: 'mj_type_int'
                                              }
                                            }
                                          }
                                        }
                                      },
                                      BODY: {
                                        block: {
                                          type: 'mj_statement_assign',
                                          fields: {
                                            NAME: 'borderWidth'
                                          },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: 'mj_expr_identifier',
                                                fields: {
                                                  NAME: 'b'
                                                }
                                              }
                                            }
                                          }
                                        }
                                      },
                                      RETURN: {
                                        block: {
                                          type: 'mj_expr_integer',
                                          fields: {
                                            VALUE: 0
                                          }
                                        }
                                      }
                                    },
                                    next: {
                                      block: {
                                        type: 'mj_method_declaration',
                                        fields: {
                                          NAME: 'GetAreaWithBorder'
                                        },
                                        inputs: {
                                          TYPE: {
                                            block: {
                                              type: 'mj_type_int'
                                            }
                                          },
                                          VARS: {
                                            block: {
                                              type: 'mj_var_declaration',
                                              fields: {
                                                NAME: 'totalWidth'
                                              },
                                              inputs: {
                                                TYPE: {
                                                  block: {
                                                    type: 'mj_type_int'
                                                  }
                                                }
                                              },
                                              next: {
                                                block: {
                                                  type: 'mj_var_declaration',
                                                  fields: {
                                                    NAME: 'totalHeight'
                                                  },
                                                  inputs: {
                                                    TYPE: {
                                                      block: {
                                                        type: 'mj_type_int'
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          },
                                          BODY: {
                                            block: {
                                              type: 'mj_statement_assign',
                                              fields: {
                                                NAME: 'totalWidth'
                                              },
                                              inputs: {
                                                VALUE: {
                                                  block: {
                                                    type: 'mj_expr_arith',
                                                    fields: {
                                                      OP: '+'
                                                    },
                                                    inputs: {
                                                      LEFT: {
                                                        block: {
                                                          type: 'mj_expr_identifier',
                                                          fields: {
                                                            NAME: 'width'
                                                          }
                                                        }
                                                      },
                                                      RIGHT: {
                                                        block: {
                                                          type: 'mj_expr_arith',
                                                          fields: {
                                                            OP: '*'
                                                          },
                                                          inputs: {
                                                            LEFT: {
                                                              block: {
                                                                type: 'mj_expr_identifier',
                                                                fields: {
                                                                  NAME: 'borderWidth'
                                                                }
                                                              }
                                                            },
                                                            RIGHT: {
                                                              block: {
                                                                type: 'mj_expr_integer',
                                                                fields: {
                                                                  VALUE: 2
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              },
                                              next: {
                                                block: {
                                                  type: 'mj_statement_assign',
                                                  fields: {
                                                    NAME: 'totalHeight'
                                                  },
                                                  inputs: {
                                                    VALUE: {
                                                      block: {
                                                        type: 'mj_expr_arith',
                                                        fields: {
                                                          OP: '+'
                                                        },
                                                        inputs: {
                                                          LEFT: {
                                                            block: {
                                                              type: 'mj_expr_identifier',
                                                              fields: {
                                                                NAME: 'height'
                                                              }
                                                            }
                                                          },
                                                          RIGHT: {
                                                            block: {
                                                              type: 'mj_expr_arith',
                                                              fields: {
                                                                OP: '*'
                                                              },
                                                              inputs: {
                                                                LEFT: {
                                                                  block: {
                                                                    type: 'mj_expr_identifier',
                                                                    fields: {
                                                                      NAME: 'borderWidth'
                                                                    }
                                                                  }
                                                                },
                                                                RIGHT: {
                                                                  block: {
                                                                    type: 'mj_expr_integer',
                                                                    fields: {
                                                                      VALUE: 2
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          },
                                          RETURN: {
                                            block: {
                                              type: 'mj_expr_arith',
                                              fields: {
                                                OP: '*'
                                              },
                                              inputs: {
                                                LEFT: {
                                                  block: {
                                                    type: 'mj_expr_identifier',
                                                    fields: {
                                                      NAME: 'totalWidth'
                                                    }
                                                  }
                                                },
                                                RIGHT: {
                                                  block: {
                                                    type: 'mj_expr_identifier',
                                                    fields: {
                                                      NAME: 'totalHeight'
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    }
  },
  {
    id: 'aliasing-contrast',
    label: 'Aliasing Contrast (A vs B)',
    description: 'Two aliases, one field write: heap references print 4141, inline structures print 41 — load it in the A vs B tab',
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'mj_goal',
            x: 48,
            y: 48,
            deletable: false,
            movable: false,
            inputs: {
              MAIN: {
                block: {
                  type: 'mj_main_class',
                  fields: {
                    CLASS: 'Main',
                    ARG: 'args'
                  },
                  inputs: {
                    STATEMENT: {
                      block: {
                        type: 'mj_statement_print',
                        inputs: {
                          VALUE: {
                            block: {
                              type: 'mj_expr_method_call',
                              fields: {
                                METHOD: 'go'
                              },
                              inputs: {
                                OBJECT: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: {
                                      CLASS: 'P'
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              CLASSES: {
                block: {
                  type: 'mj_class_declaration',
                  fields: {
                    CLASS: 'P'
                  },
                  inputs: {
                    METHODS: {
                      block: {
                        type: 'mj_method_declaration',
                        fields: {
                          NAME: 'go'
                        },
                        inputs: {
                          TYPE: {
                            block: {
                              type: 'mj_type_int'
                            }
                          },
                          VARS: {
                            block: {
                              type: 'mj_var_declaration',
                              fields: {
                                NAME: 'x'
                              },
                              inputs: {
                                TYPE: {
                                  block: {
                                    type: 'mj_type_identifier',
                                    fields: {
                                      NAME: 'Cell'
                                    }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'mj_var_declaration',
                                  fields: {
                                    NAME: 'y'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_identifier',
                                        fields: {
                                          NAME: 'Cell'
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          BODY: {
                            block: {
                              type: 'mj_statement_assign',
                              fields: {
                                NAME: 'x'
                              },
                              inputs: {
                                VALUE: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: {
                                      CLASS: 'Cell'
                                    }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'mj_statement_assign',
                                  fields: {
                                    NAME: 'y'
                                  },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'mj_expr_identifier',
                                        fields: {
                                          NAME: 'x'
                                        }
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'mj_statement_assign',
                                      fields: {
                                        NAME: 'y'
                                      },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: 'mj_expr_method_call',
                                            fields: {
                                              METHOD: 'with'
                                            },
                                            inputs: {
                                              OBJECT: {
                                                block: {
                                                  type: 'mj_expr_identifier',
                                                  fields: {
                                                    NAME: 'y'
                                                  }
                                                }
                                              },
                                              ARGS: {
                                                block: {
                                                  type: 'mj_argument_item',
                                                  inputs: {
                                                    EXPR: {
                                                      block: {
                                                        type: 'mj_expr_integer',
                                                        fields: {
                                                          VALUE: 41
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          RETURN: {
                            block: {
                              type: 'mj_expr_arith',
                                    fields: { OP: '+' },
                              inputs: {
                                LEFT: {
                                  block: {
                                    type: 'mj_expr_arith',
                                    fields: { OP: '*' },
                                    inputs: {
                                      LEFT: {
                                        block: {
                                          type: 'mj_expr_method_call',
                                          fields: {
                                            METHOD: 'get'
                                          },
                                          inputs: {
                                            OBJECT: {
                                              block: {
                                                type: 'mj_expr_identifier',
                                                fields: {
                                                  NAME: 'x'
                                                }
                                              }
                                            }
                                          }
                                        }
                                      },
                                      RIGHT: {
                                        block: {
                                          type: 'mj_expr_integer',
                                          fields: {
                                            VALUE: 100
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                RIGHT: {
                                  block: {
                                    type: 'mj_expr_method_call',
                                    fields: {
                                      METHOD: 'get'
                                    },
                                    inputs: {
                                      OBJECT: {
                                        block: {
                                          type: 'mj_expr_identifier',
                                          fields: {
                                            NAME: 'y'
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'mj_class_declaration',
                      fields: {
                        CLASS: 'Cell'
                      },
                      inputs: {
                        VARS: {
                          block: {
                            type: 'mj_var_declaration',
                            fields: {
                              NAME: 'f'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_int'
                                }
                              }
                            }
                          }
                        },
                        METHODS: {
                          block: {
                            type: 'mj_method_declaration',
                            fields: {
                              NAME: 'with'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_identifier',
                                  fields: {
                                    NAME: 'Cell'
                                  }
                                }
                              },
                              PARAMS: {
                                block: {
                                  type: 'mj_formal_parameter',
                                  fields: {
                                    NAME: 'v'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_int'
                                      }
                                    }
                                  }
                                }
                              },
                              BODY: {
                                block: {
                                  type: 'mj_statement_assign',
                                  fields: {
                                    NAME: 'f'
                                  },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'mj_expr_identifier',
                                        fields: {
                                          NAME: 'v'
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              RETURN: {
                                block: {
                                  type: 'mj_expr_this'
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'mj_method_declaration',
                                fields: {
                                  NAME: 'get'
                                },
                                inputs: {
                                  TYPE: {
                                    block: {
                                      type: 'mj_type_int'
                                    }
                                  },
                                  RETURN: {
                                    block: {
                                      type: 'mj_expr_identifier',
                                      fields: {
                                        NAME: 'f'
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    }
  },
  {
    id: 'independent-copies',
    label: 'Independent Copies (Rewrite)',
    description: 'Substitution copies the receiver: c.with(41).get() + c.get() rewrites to 41 + 0 — load it in the Rewrite tab',
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'mj_goal',
            x: 48,
            y: 48,
            deletable: false,
            movable: false,
            inputs: {
              MAIN: {
                block: {
                  type: 'mj_main_class',
                  fields: {
                    CLASS: 'Main',
                    ARG: 'args'
                  },
                  inputs: {
                    STATEMENT: {
                      block: {
                        type: 'mj_statement_print',
                        inputs: {
                          VALUE: {
                            block: {
                              type: 'mj_expr_method_call',
                              fields: {
                                METHOD: 'both'
                              },
                              inputs: {
                                OBJECT: {
                                  block: {
                                    type: 'mj_expr_new_object',
                                    fields: {
                                      CLASS: 'P'
                                    }
                                  }
                                },
                                ARGS: {
                                  block: {
                                    type: 'mj_argument_item',
                                    inputs: {
                                      EXPR: {
                                        block: {
                                          type: 'mj_expr_new_object',
                                          fields: {
                                            CLASS: 'Cell'
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              CLASSES: {
                block: {
                  type: 'mj_class_declaration',
                  fields: {
                    CLASS: 'P'
                  },
                  inputs: {
                    METHODS: {
                      block: {
                        type: 'mj_method_declaration',
                        fields: {
                          NAME: 'both'
                        },
                        inputs: {
                          TYPE: {
                            block: {
                              type: 'mj_type_int'
                            }
                          },
                          PARAMS: {
                            block: {
                              type: 'mj_formal_parameter',
                              fields: {
                                NAME: 'c'
                              },
                              inputs: {
                                TYPE: {
                                  block: {
                                    type: 'mj_type_identifier',
                                    fields: {
                                      NAME: 'Cell'
                                    }
                                  }
                                }
                              }
                            }
                          },
                          RETURN: {
                            block: {
                              type: 'mj_expr_arith',
                                    fields: { OP: '+' },
                              inputs: {
                                LEFT: {
                                  block: {
                                    type: 'mj_expr_method_call',
                                    fields: {
                                      METHOD: 'get'
                                    },
                                    inputs: {
                                      OBJECT: {
                                        block: {
                                          type: 'mj_expr_method_call',
                                          fields: {
                                            METHOD: 'with'
                                          },
                                          inputs: {
                                            OBJECT: {
                                              block: {
                                                type: 'mj_expr_identifier',
                                                fields: {
                                                  NAME: 'c'
                                                }
                                              }
                                            },
                                            ARGS: {
                                              block: {
                                                type: 'mj_argument_item',
                                                inputs: {
                                                  EXPR: {
                                                    block: {
                                                      type: 'mj_expr_integer',
                                                      fields: {
                                                        VALUE: 41
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                RIGHT: {
                                  block: {
                                    type: 'mj_expr_method_call',
                                    fields: {
                                      METHOD: 'get'
                                    },
                                    inputs: {
                                      OBJECT: {
                                        block: {
                                          type: 'mj_expr_identifier',
                                          fields: {
                                            NAME: 'c'
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'mj_class_declaration',
                      fields: {
                        CLASS: 'Cell'
                      },
                      inputs: {
                        VARS: {
                          block: {
                            type: 'mj_var_declaration',
                            fields: {
                              NAME: 'f'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_int'
                                }
                              }
                            }
                          }
                        },
                        METHODS: {
                          block: {
                            type: 'mj_method_declaration',
                            fields: {
                              NAME: 'with'
                            },
                            inputs: {
                              TYPE: {
                                block: {
                                  type: 'mj_type_identifier',
                                  fields: {
                                    NAME: 'Cell'
                                  }
                                }
                              },
                              PARAMS: {
                                block: {
                                  type: 'mj_formal_parameter',
                                  fields: {
                                    NAME: 'v'
                                  },
                                  inputs: {
                                    TYPE: {
                                      block: {
                                        type: 'mj_type_int'
                                      }
                                    }
                                  }
                                }
                              },
                              BODY: {
                                block: {
                                  type: 'mj_statement_assign',
                                  fields: {
                                    NAME: 'f'
                                  },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'mj_expr_identifier',
                                        fields: {
                                          NAME: 'v'
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              RETURN: {
                                block: {
                                  type: 'mj_expr_this'
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'mj_method_declaration',
                                fields: {
                                  NAME: 'get'
                                },
                                inputs: {
                                  TYPE: {
                                    block: {
                                      type: 'mj_type_int'
                                    }
                                  },
                                  RETURN: {
                                    block: {
                                      type: 'mj_expr_identifier',
                                      fields: {
                                        NAME: 'f'
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
];
